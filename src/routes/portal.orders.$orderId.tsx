import { SplitText } from "@/components/ui/split-text";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StageTimeline } from "@/components/StageTimeline";
import { STAGE_LABEL } from "@/lib/stages";
import { generatePackingSlipPdf, generateCompliancePackPdf } from "@/lib/packing-slip";
import { qrDataUrl } from "@/lib/qr";
import { Download, ArrowLeft, CheckCircle2, Package, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/hooks/useAuth";
import { SampleCard } from "@/components/SampleCard";
import { OrderHeroCard } from "@/components/OrderHeroCard";

export const Route = createFileRoute("/portal/orders/$orderId")({
  component: () => <RoleGuard allow={["customer", "admin", "lab"]}><OrderDetail /></RoleGuard>,
});

const CUSTOMER_NAV = [
  { to: "/portal", label: "My orders" },
  { to: "/portal/new", label: "New order" },
];
const ADMIN_NAV = [
  { to: "/admin", label: "Operations" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/finance", label: "Finance" },
  { to: "/admin/config", label: "Configuration" },
];
const LAB_NAV = [
  { to: "/lab", label: "Queue" },
  { to: "/lab/scan", label: "Scan" },
];

function OrderDetail() {
  const { orderId } = Route.useParams();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const isLab = roles.includes("lab");
  const isStaff = isAdmin || isLab;
  const NAV = isAdmin ? ADMIN_NAV : isLab ? LAB_NAV : CUSTOMER_NAV;
  const SHELL_TITLE = isAdmin ? "Admin Portal" : isLab ? "Lab Workspace" : "Customer Portal";
  const BACK_TO = isAdmin ? "/admin" : isLab ? "/lab" : "/portal";
  const [order, setOrder] = useState<any>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [products, setProducts] = useState<Record<string, any>>({});
  const [events, setEvents] = useState<any[]>([]);
  const [shipment, setShipment] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [orderQr, setOrderQr] = useState<string>("");
  const [sampleQrs, setSampleQrs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, any[]>>({});
  const [parameters, setParameters] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", orderId).single();
      setOrder(o);
      const { data: ss } = await supabase.from("order_samples").select("*").eq("order_id", orderId);
      setSamples(ss ?? []);
      const ids = Array.from(new Set((ss ?? []).map((s) => s.product_id)));
      if (ids.length) {
        const { data: ps } = await supabase.from("products").select("*").in("id", ids);
        setProducts(Object.fromEntries((ps ?? []).map((p) => [p.id, p])));
      }
      const { data: ev } = await supabase
        .from("chain_of_custody_events").select("*").eq("order_id", orderId).order("created_at");
      setEvents(ev ?? []);
      const { data: sh } = await supabase.from("shipments").select("*").eq("order_id", orderId).maybeSingle();
      setShipment(sh);
      const { data: pay } = await supabase.from("payments").select("*").eq("order_id", orderId).maybeSingle();
      setPayment(pay);

      if (o) setOrderQr(await qrDataUrl(`${window.location.origin}/portal/orders/${o.id}`, 220));
      const qrMap: Record<string, string> = {};
      for (const s of ss ?? []) {
        qrMap[s.id] = await qrDataUrl(`${window.location.origin}/portal/samples/${s.id}`, 180);
      }
      setSampleQrs(qrMap);

      // Load results + parameters for compliance pack
      const sampleIds = (ss ?? []).map((s) => s.id);
      if (sampleIds.length) {
        const { data: rs } = await supabase.from("test_results").select("*").in("sample_id", sampleIds);
        const byS: Record<string, any[]> = {};
        (rs ?? []).forEach((r) => { (byS[r.sample_id] = byS[r.sample_id] ?? []).push(r); });
        setResults(byS);
        const paramIds = Array.from(new Set((rs ?? []).map((r) => r.parameter_id)));
        if (paramIds.length) {
          const { data: ps } = await supabase.from("test_parameters").select("*").in("id", paramIds);
          setParameters(Object.fromEntries((ps ?? []).map((p) => [p.id, p])));
        }
      }
    })();
  }, [orderId]);

  async function downloadPackingSlip() {
    if (!order || samples.length === 0) return;
    try {
      const blob = await generatePackingSlipPdf({
        orderNumber: order.order_number,
        orderQr: order.id,
        customerName: "Customer",
        pickupAddress: order.pickup_address,
        deliveryType: order.delivery_type,
        samples: samples.map((s) => ({
          label: s.sample_label,
          product: products[s.product_id]?.name ?? "",
          qrCode: s.id,
        })),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${order.order_number}-packing-slip.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function downloadCompliancePack() {
    if (!order) return;
    try {
      const verificationUrl = `${window.location.origin}/portal/orders/${order.id}`;
      const blob = await generateCompliancePackPdf({
        orderNumber: order.order_number,
        orderId: order.id,
        customerName: "Customer",
        releasedAt: order.released_at ?? new Date().toISOString(),
        verificationUrl,
        samples: samples.map((s) => ({
          label: s.sample_label,
          product: products[s.product_id]?.name ?? "",
          batch: s.batch_no,
          origin: s.origin,
          qrCode: s.qr_code,
          results: (results[s.id] ?? []).map((r) => {
            const p = parameters[r.parameter_id] ?? {};
            return {
              name: p.name ?? "—",
              unit: p.unit,
              value: r.value != null ? String(r.value) : (r.text_value ?? "—"),
              passed: r.passed,
              range: p.min_value != null || p.max_value != null
                ? `${p.min_value ?? "—"} – ${p.max_value ?? "—"}`
                : "—",
            };
          }),
        })),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${order.order_number}-compliance-pack.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!order) return <PortalShell title={SHELL_TITLE} nav={NAV}>Loading…</PortalShell>;

  const isJustPaid = order.stage === "paid" || order.stage === "ordered";
  const isReleased = order.stage === "released";

  return (
    <PortalShell title={SHELL_TITLE} nav={NAV}>
      <Link to={BACK_TO as "/portal"} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />Back
      </Link>

      {isJustPaid && payment?.status === "paid" && (
        <Card className="mb-6 border-green-500/30 bg-green-500/5 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <h2 className="font-semibold text-green-700 dark:text-green-400">Payment received</h2>
              <p className="text-sm text-muted-foreground">
                Print or save the QR codes below, attach them to each sample, and follow the packaging instructions before pickup.
              </p>
            </div>
          </div>
        </Card>
      )}

      {isReleased && (
        <Card className="mb-6 border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileCheck2 className="h-6 w-6 text-primary" />
              <div>
                <h2 className="font-semibold">Report released</h2>
                <p className="text-sm text-muted-foreground">
                  Your compliance pack (Report + CoA) is ready. Verification QR is embedded in the PDF.
                </p>
              </div>
            </div>
            <Button onClick={downloadCompliancePack}>
              <Download className="mr-2 h-4 w-4" />Compliance pack
            </Button>
          </div>
        </Card>
      )}

      <OrderHeroCard
        orderNumber={order.order_number}
        orderId={order.id}
        stage={order.stage}
        createdAt={order.created_at}
        deliveryType={order.delivery_type}
        pickupAddress={order.pickup_address}
        deliveryAddress={order.delivery_address}
        total={Number(order.total ?? 0)}
        sampleCount={samples.length}
        qrDataUrl={orderQr}
        primaryAction={
          isReleased
            ? { label: "Download compliance pack", onClick: () => downloadCompliancePack() }
            : { label: "Download packing slip", onClick: () => downloadPackingSlip() }
        }
      />

      <div className="h-6" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Chain of custody</h2>
            <StageTimeline currentStage={order.stage} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 flex items-center gap-2 font-semibold">
              <Package className="h-4 w-4" /> Samples ({samples.length})
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Print each QR code and attach it to the matching sample container. Labs will scan to look up details.
            </p>
            <div className="grid gap-4 sm:grid-cols-1">
              {samples.map((s) => {
                const product = products[s.product_id];
                return (
                  <SampleCard
                    key={s.id}
                    sampleId={s.id}
                    label={s.sample_label}
                    stage={s.stage}
                    productName={product?.name}
                    itemCode={product?.item_code}
                    category={product?.category}
                    batchNo={s.batch_no}
                    origin={s.origin}
                    composition={s.composition}
                    packagingInstructions={product?.packaging_instructions}
                    tatDays={product?.tat_days}
                    qrDataUrl={sampleQrs[s.id]}
                    intake={
                      isStaff && s.intake_at
                        ? {
                            disposition: s.intake_disposition,
                            weightG: s.intake_weight_g,
                            condition: s.intake_condition,
                            notes: s.intake_notes,
                          }
                        : null
                    }
                  />
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-2 font-semibold">Activity</h3>
            <ul className="space-y-1 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex justify-between text-muted-foreground">
                  <span>{e.description || e.event_type}</span>
                  <span>{new Date(e.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Order QR</h3>
            {orderQr ? (
              <img src={orderQr} alt="Order QR" className="mx-auto h-40 w-40 rounded-md border bg-white p-1" />
            ) : (
              <div className="mx-auto h-40 w-40 animate-pulse rounded-md bg-muted" />
            )}
            <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground break-all">{order.id}</p>
            <Button variant="outline" className="mt-3 w-full" onClick={downloadPackingSlip}>
              <Download className="mr-2 h-4 w-4" />Packing slip (PDF)
            </Button>
            {isReleased && (
              <Button className="mt-2 w-full" onClick={downloadCompliancePack}>
                <FileCheck2 className="mr-2 h-4 w-4" />Compliance pack
              </Button>
            )}
          </Card>

          {!isLab && (
            <Card className="p-5 text-sm">
              <h3 className="mb-2 font-semibold">Payment</h3>
              {payment ? (
                <>
                  <div className="flex justify-between"><span>Amount</span><span>RM{Number(payment.amount).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Status</span><Badge variant="secondary">{payment.status}</Badge></div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">{payment.provider_ref}</div>
                </>
              ) : <p className="text-muted-foreground">No payment yet.</p>}
            </Card>
          )}

          <Card className="p-5 text-sm">
            <h3 className="mb-2 font-semibold">Shipment</h3>
            {shipment ? (
              <>
                <div className="flex justify-between"><span>Tracking</span><span className="font-mono text-xs">{shipment.tracking_id}</span></div>
                <div className="flex justify-between"><span>ETA</span><span>{shipment.eta ? new Date(shipment.eta).toLocaleString() : "—"}</span></div>
                <div className="flex justify-between"><span>Status</span><Badge variant="secondary">{shipment.status}</Badge></div>
              </>
            ) : <p className="text-muted-foreground">No shipment yet.</p>}
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
