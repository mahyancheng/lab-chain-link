import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StageTimeline } from "@/components/StageTimeline";
import { STAGE_LABEL } from "@/lib/stages";
import { generatePackingSlipPdf } from "@/lib/packing-slip";
import { Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/orders/$orderId")({
  component: OrderDetail,
});

const NAV = [
  { to: "/portal", label: "My orders" },
  { to: "/portal/new", label: "New order" },
];

function OrderDetail() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<any>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [products, setProducts] = useState<Record<string, any>>({});
  const [events, setEvents] = useState<any[]>([]);
  const [shipment, setShipment] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);

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
        .from("chain_of_custody_events")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at");
      setEvents(ev ?? []);
      const { data: sh } = await supabase.from("shipments").select("*").eq("order_id", orderId).maybeSingle();
      setShipment(sh);
      const { data: pay } = await supabase.from("payments").select("*").eq("order_id", orderId).maybeSingle();
      setPayment(pay);
    })();
  }, [orderId]);

  async function downloadPackingSlip() {
    if (!order || samples.length === 0) return;
    try {
      const blob = await generatePackingSlipPdf({
        orderNumber: order.order_number,
        orderQr: order.qr_code,
        customerName: "Customer",
        pickupAddress: order.pickup_address,
        deliveryType: order.delivery_type,
        samples: samples.map((s) => ({
          label: s.sample_label,
          product: products[s.product_id]?.name ?? "",
          qrCode: s.qr_code,
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

  if (!order) return <PortalShell title="Customer Portal" nav={NAV}>Loading…</PortalShell>;

  return (
    <PortalShell title="Customer Portal" nav={NAV}>
      <Link to="/portal" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />Back
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleString()} · {order.delivery_type.replace("_", " ")}
          </p>
        </div>
        <Badge>{STAGE_LABEL[order.stage] ?? order.stage}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Chain of custody</h2>
          <StageTimeline currentStage={order.stage} />

          <h3 className="mb-2 mt-6 font-semibold">Samples ({samples.length})</h3>
          <div className="space-y-2">
            {samples.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <div className="font-medium">{s.sample_label}</div>
                  <div className="text-xs text-muted-foreground">{products[s.product_id]?.name}</div>
                </div>
                <Badge variant="outline">{STAGE_LABEL[s.stage] ?? s.stage}</Badge>
              </div>
            ))}
          </div>

          <h3 className="mb-2 mt-6 font-semibold">Activity</h3>
          <ul className="space-y-1 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex justify-between text-muted-foreground">
                <span>{e.description || e.event_type}</span>
                <span>{new Date(e.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-2 font-semibold">Documents</h3>
            <Button variant="outline" className="w-full" onClick={downloadPackingSlip}>
              <Download className="mr-2 h-4 w-4" />Packing slip (PDF)
            </Button>
          </Card>

          <Card className="p-5 text-sm">
            <h3 className="mb-2 font-semibold">Payment</h3>
            {payment ? (
              <>
                <div className="flex justify-between"><span>Amount</span><span>₹{Number(payment.amount).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Status</span><Badge variant="secondary">{payment.status}</Badge></div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{payment.provider_ref}</div>
              </>
            ) : <p className="text-muted-foreground">No payment yet.</p>}
          </Card>

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
