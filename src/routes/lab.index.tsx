import { SplitText } from "@/components/ui/split-text";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import { SampleListRow } from "@/components/SampleListRow";
import { OrdersFilterBar, EMPTY_FILTERS, type OrdersFilterValue } from "@/components/OrdersFilterBar";

const LAB_SAMPLE_STAGES = [
  "pending",
  "received",
  "sample_prep",
  "in_testing",
  "data_validation",
  "qa_review",
  "ready_for_release",
  "released",
  "rejected",
];

export const Route = createFileRoute("/lab/")({
  component: () => <RoleGuard allow={["lab"]}><LabHome /></RoleGuard>,
});

const NAV = [
  { to: "/lab", label: "Queue" },
  { to: "/lab/scan", label: "Scan QR" },
  { to: "/admin/customers", label: "Customers" },
];

function LabHome() {
  const nav = useNavigate();
  const [samples, setSamples] = useState<any[]>([]);
  const [orders, setOrders] = useState<Record<string, any>>({});
  const [products, setProducts] = useState<Record<string, any>>({});
  const [scan, setScan] = useState("");
  const [filters, setFilters] = useState<OrdersFilterValue>(EMPTY_FILTERS);

  const filteredSamples = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const fromTs = filters.from ? new Date(filters.from + "T00:00:00").getTime() : null;
    const toTs = filters.to ? new Date(filters.to + "T23:59:59.999").getTime() : null;
    return samples.filter((s) => {
      if (filters.stage !== "all" && s.stage !== filters.stage) return false;
      const t = new Date(s.created_at).getTime();
      if (fromTs !== null && t < fromTs) return false;
      if (toTs !== null && t > toTs) return false;
      if (q) {
        const hay = [
          s.sample_label,
          s.batch_no,
          orders[s.order_id]?.order_number,
          products[s.product_id]?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [samples, orders, products, filters]);

  async function load() {
    const { data } = await supabase
      .from("order_samples")
      .select("*")
      .order("created_at", { ascending: false });
    setSamples(data ?? []);
    const orderIds = Array.from(new Set((data ?? []).map((s) => s.order_id)));
    if (orderIds.length) {
      const { data: os } = await supabase.from("orders").select("*").in("id", orderIds);
      setOrders(Object.fromEntries((os ?? []).map((o) => [o.id, o])));
    }
    const productIds = Array.from(new Set((data ?? []).map((s) => s.product_id).filter(Boolean)));
    if (productIds.length) {
      const { data: ps } = await supabase.from("products").select("*").in("id", productIds);
      setProducts(Object.fromEntries((ps ?? []).map((p) => [p.id, p])));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function lookupScan() {
    const code = scan.trim();
    if (!code) return;
    const { data: s } = await supabase.from("order_samples").select("id, order_id").eq("qr_code", code).maybeSingle();
    if (s) {
      nav({ to: "/lab/samples/$sampleId", params: { sampleId: s.id } });
      return;
    }
    const { data: o } = await supabase.from("orders").select("id").eq("qr_code", code).maybeSingle();
    if (o) {
      nav({ to: "/portal/orders/$orderId", params: { orderId: o.id } });
      return;
    }
    toast.error("No order or sample matches that code");
  }

  return (
    <PortalShell title="Lab Workspace" nav={NAV} requireRole="lab">
      <h1 className="mb-6 text-2xl font-bold"><SplitText>Sample queue</SplitText></h1>

      <Card className="mb-6 p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter or scan a QR code"
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookupScan()}
          />
          <Button onClick={lookupScan}>Open</Button>
        </div>
      </Card>

      <OrdersFilterBar
        value={filters}
        onChange={setFilters}
        stages={LAB_SAMPLE_STAGES}
        searchPlaceholder="Search by sample label, order #, batch…"
      />

      <div className="space-y-3">
        {samples.length === 0 ? (
          <p className="text-muted-foreground">No active samples.</p>
        ) : filteredSamples.length === 0 ? (
          <p className="text-muted-foreground">No samples match your filters.</p>
        ) : (
          filteredSamples.map((s) => (
            <SampleListRow
              key={s.id}
              sample={{
                id: s.id,
                sample_label: s.sample_label,
                stage: s.stage,
                qr_code: s.qr_code,
                order_id: s.order_id,
                order_number: orders[s.order_id]?.order_number ?? null,
                product_name: products[s.product_id]?.name ?? null,
                batch_no: s.batch_no ?? null,
                created_at: s.created_at,
              }}
            />
          ))
        )}
      </div>
    </PortalShell>
  );
}
