import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { RoleGuard } from "@/components/RoleGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";
import { SplitText } from "@/components/ui/split-text";
import { useAuth } from "@/hooks/useAuth";

const ADMIN_NAV = [
  { to: "/admin", label: "Operations" },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/finance", label: "Finance" },
  { to: "/admin/config", label: "Configuration" },
];

const LAB_NAV = [
  { to: "/lab", label: "Queue" },
  { to: "/lab/scan", label: "Scan QR" },
  { to: "/lab/customers", label: "Customers" },
];

export const Route = createFileRoute("/admin/customers/")({
  component: () => (
    <RoleGuard allow={["admin", "lab"]}>
      <CustomersList />
    </RoleGuard>
  ),
});

interface Row {
  id: string;
  full_name: string | null;
  company: string | null;
  phone: string | null;
  created_at: string;
  order_count: number;
  last_order_at: string | null;
  open_exceptions: number;
  unread: number;
}

function CustomersList() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Fetch customer profiles (only those with the customer role) + aggregates client-side.
      const [rolesRes, profilesRes, ordersRes, exRes] = await Promise.all([
        supabase.from("user_roles").select("user_id").eq("role", "customer"),
        supabase.from("profiles").select("id, full_name, company, phone, created_at"),
        supabase
          .from("orders")
          .select("customer_id, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("exceptions").select("order_id, status").eq("status", "open"),
      ]);

      const customerIds = new Set((rolesRes.data ?? []).map((r) => r.user_id));
      const profileMap = new Map(
        (profilesRes.data ?? []).map((p) => [p.id, p]),
      );
      const orderAgg = new Map<string, { count: number; last: string | null }>();
      (ordersRes.data ?? []).forEach((o) => {
        const cur = orderAgg.get(o.customer_id) ?? { count: 0, last: null };
        cur.count++;
        if (!cur.last || new Date(o.created_at) > new Date(cur.last)) cur.last = o.created_at;
        orderAgg.set(o.customer_id, cur);
      });

      // Open exceptions per customer (need order→customer map)
      const orderToCustomer = new Map<string, string>();
      (ordersRes.data ?? []).forEach((o: any) => orderToCustomer.set(o.id, o.customer_id));
      const { data: ordersFull } = await supabase
        .from("orders")
        .select("id, customer_id");
      (ordersFull ?? []).forEach((o) => orderToCustomer.set(o.id, o.customer_id));
      const exByCustomer = new Map<string, number>();
      (exRes.data ?? []).forEach((e) => {
        const cid = e.order_id ? orderToCustomer.get(e.order_id) : null;
        if (cid) exByCustomer.set(cid, (exByCustomer.get(cid) ?? 0) + 1);
      });

      const built: Row[] = Array.from(customerIds).map((id) => {
        const p = profileMap.get(id);
        const agg = orderAgg.get(id) ?? { count: 0, last: null };
        return {
          id,
          full_name: p?.full_name ?? null,
          company: p?.company ?? null,
          phone: p?.phone ?? null,
          created_at: p?.created_at ?? new Date().toISOString(),
          order_count: agg.count,
          last_order_at: agg.last,
          open_exceptions: exByCustomer.get(id) ?? 0,
          unread: 0,
        };
      });
      built.sort((a, b) => {
        const at = a.last_order_at ? new Date(a.last_order_at).getTime() : 0;
        const bt = b.last_order_at ? new Date(b.last_order_at).getTime() : 0;
        return bt - at;
      });
      setRows(built);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.full_name, r.company, r.phone, r.id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t)),
    );
  }, [rows, q]);

  return (
    <PortalShell
      title={isAdmin ? "Admin Portal" : "Lab Workspace"}
      nav={isAdmin ? ADMIN_NAV : LAB_NAV}
      requireRole={isAdmin ? "admin" : "lab"}
    >
      <div className="mb-6 flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">
          <SplitText>Customers</SplitText>
        </h1>
      </div>

      <Card className="p-4">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, company, phone…"
            className="pl-8"
          />
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No customers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead>Last order</TableHead>
                  <TableHead className="text-right">Open issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link
                        to="/admin/customers/$customerId"
                        params={{ customerId: r.id }}
                        className="hover:underline"
                      >
                        {r.full_name ?? <span className="text-muted-foreground">Unnamed</span>}
                      </Link>
                    </TableCell>
                    <TableCell>{r.company ?? "—"}</TableCell>
                    <TableCell>{r.phone ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.order_count}</TableCell>
                    <TableCell>
                      {r.last_order_at
                        ? new Date(r.last_order_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.open_exceptions > 0 ? (
                        <Badge variant="destructive">{r.open_exceptions}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </PortalShell>
  );
}
