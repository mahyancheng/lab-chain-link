import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABEL } from "@/lib/stages";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/admin/")({
  component: () => <RoleGuard allow={["admin"]}><AdminHome /></RoleGuard>,
});

const NAV = [
  { to: "/admin", label: "Operations" },
  { to: "/admin/finance", label: "Finance" },
  { to: "/admin/config", label: "Configuration" },
];

function AdminHome() {
  const [orders, setOrders] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase
      .from("orders")
      .select("id, order_number, stage, total, created_at, delivery_type")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setOrders(data ?? []);
        const c: Record<string, number> = {};
        (data ?? []).forEach((o) => (c[o.stage] = (c[o.stage] ?? 0) + 1));
        setCounts(c);
      });
  }, []);

  const stages = ["ordered", "paid", "in_transit", "received_at_lab", "in_testing", "qa_review", "released"];

  return (
    <PortalShell title="Admin Portal" nav={NAV} requireRole="admin">
      <h1 className="mb-6 text-2xl font-bold">Operations</h1>

      <div className="mb-6 grid gap-3 md:grid-cols-7">
        {stages.map((s) => (
          <Card key={s} className="p-4">
            <div className="text-xs text-muted-foreground">{STAGE_LABEL[s]}</div>
            <div className="mt-1 text-2xl font-bold">{counts[s] ?? 0}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Recent orders</h2>
        <div className="space-y-2">
          {orders.map((o) => (
            <Link key={o.id} to="/portal/orders/$orderId" params={{ orderId: o.id }}>
              <div className="flex items-center justify-between rounded-md border p-3 text-sm hover:border-primary">
                <div>
                  <div className="font-medium">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()} · {o.delivery_type.replace("_", " ")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span>₹{Number(o.total).toFixed(2)}</span>
                  <Badge variant="secondary">{STAGE_LABEL[o.stage] ?? o.stage}</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </PortalShell>
  );
}
