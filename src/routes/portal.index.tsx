import { SplitText } from "@/components/ui/split-text";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderListRow } from "@/components/OrderListRow";
import { Plus } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { OrdersFilterBar, EMPTY_FILTERS, filterOrders, type OrdersFilterValue } from "@/components/OrdersFilterBar";
import { ORDER_STAGES } from "@/lib/stages";

export const Route = createFileRoute("/portal/")({
  component: () => <RoleGuard allow={["customer"]}><PortalHome /></RoleGuard>,
});

const NAV = [
  { to: "/portal", label: "My orders" },
  { to: "/portal/new", label: "New order" },
];

function PortalHome() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<OrdersFilterValue>(EMPTY_FILTERS);
  const filtered = useMemo(() => filterOrders(orders, filters), [orders, filters]);

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

  const inProgress = orders.filter(
    (o) => !["released", "cancelled"].includes(o.stage),
  ).length;
  const released = orders.filter((o) => o.stage === "released").length;
  const totalSpend = orders
    .filter((o) => o.stage !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total ?? 0), 0);

  return (
    <PortalShell title="Customer Portal" nav={NAV}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight"><SplitText>Dashboard</SplitText></h1>
          <p className="text-sm text-muted-foreground">Your orders and lab activity at a glance.</p>
        </div>
        <Link to="/portal/new">
          <Button><Plus className="mr-2 h-4 w-4" />New order</Button>
        </Link>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">In progress</div>
          <div className="mt-1 text-3xl font-semibold">{inProgress}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Reports released</div>
          <div className="mt-1 text-3xl font-semibold">{released}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Lifetime spend</div>
          <div className="mt-1 text-3xl font-semibold">RM{totalSpend.toFixed(2)}</div>
        </Card>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Recent orders</h2>
      <OrdersFilterBar
        value={filters}
        onChange={setFilters}
        stages={[...ORDER_STAGES, "cancelled"]}
        searchPlaceholder="Search by order #…"
      />
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : orders.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">No orders yet.</p>
          <Link to="/portal/new">
            <Button className="mt-4">Place your first order</Button>
          </Link>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">No orders match your filters.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, 50).map((o) => (
            <OrderListRow
              key={o.id}
              order={{
                id: o.id,
                order_number: o.order_number,
                stage: o.stage,
                total: Number(o.total ?? 0),
                delivery_type: o.delivery_type,
                created_at: o.created_at,
              }}
            />
          ))}
        </div>
      )}
    </PortalShell>
  );
}
