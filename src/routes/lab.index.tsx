import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { STAGE_LABEL } from "@/lib/stages";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/lab/")({
  component: () => <RoleGuard allow={["lab", "admin"]}><LabHome /></RoleGuard>,
});

const NAV = [
  { to: "/lab", label: "Queue" },
  { to: "/lab/scan", label: "Scan QR" },
];

function LabHome() {
  const nav = useNavigate();
  const [samples, setSamples] = useState<any[]>([]);
  const [orders, setOrders] = useState<Record<string, any>>({});
  const [scan, setScan] = useState("");

  async function load() {
    const { data } = await supabase
      .from("order_samples")
      .select("*")
      .not("stage", "in", "(released,rejected)")
      .order("created_at", { ascending: false });
    setSamples(data ?? []);
    const ids = Array.from(new Set((data ?? []).map((s) => s.order_id)));
    if (ids.length) {
      const { data: os } = await supabase.from("orders").select("*").in("id", ids);
      setOrders(Object.fromEntries((os ?? []).map((o) => [o.id, o])));
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
      <h1 className="mb-6 text-2xl font-bold">Active queue</h1>

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

      <div className="space-y-2">
        {samples.length === 0 && <p className="text-muted-foreground">No active samples.</p>}
        {samples.map((s) => (
          <Link key={s.id} to="/lab/samples/$sampleId" params={{ sampleId: s.id }}>
            <Card className="flex items-center justify-between p-4 hover:border-primary">
              <div>
                <div className="font-medium">{s.sample_label}</div>
                <div className="text-xs text-muted-foreground">
                  Order {orders[s.order_id]?.order_number ?? s.order_id.slice(0, 8)} · QR {s.qr_code.slice(0, 10)}…
                </div>
              </div>
              <Badge variant="secondary">{STAGE_LABEL[s.stage] ?? s.stage}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </PortalShell>
  );
}
