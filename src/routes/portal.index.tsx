import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABEL } from "@/lib/stages";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/portal/")({
  component: PortalHome,
});

const NAV = [
  { to: "/portal", label: "My orders" },
  { to: "/portal/new", label: "New order" },
];

function PortalHome() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id, order_number, stage, total, delivery_type, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders(data ?? []);
        setLoading(false);
      });
  }, [user]);

  return (
    <PortalShell title="Customer Portal" nav={NAV}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My orders</h1>
        <Link to="/portal/new">
          <Button><Plus className="mr-2 h-4 w-4" />New order</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : orders.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">No orders yet.</p>
          <Link to="/portal/new">
            <Button className="mt-4">Place your first order</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} to="/portal/orders/$orderId" params={{ orderId: o.id }}>
              <Card className="flex items-center justify-between p-4 transition hover:border-primary">
                <div>
                  <div className="font-semibold">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()} · {o.delivery_type.replace("_", " ")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">₹{Number(o.total).toFixed(2)}</span>
                  <Badge variant="secondary">{STAGE_LABEL[o.stage] ?? o.stage}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
