import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/admin/finance")({
  component: () => <RoleGuard allow={["admin"]}><Finance /></RoleGuard>,
});

const NAV = [
  { to: "/admin", label: "Operations" },
  { to: "/admin/finance", label: "Finance" },
  { to: "/admin/config", label: "Configuration" },
];

function Finance() {
  const [payments, setPayments] = useState<any[]>([]);
  const [orders, setOrders] = useState<Record<string, any>>({});

  useEffect(() => {
    supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        setPayments(data ?? []);
        const ids = Array.from(new Set((data ?? []).map((p) => p.order_id)));
        if (ids.length) {
          const { data: os } = await supabase.from("orders").select("id, order_number").in("id", ids);
          setOrders(Object.fromEntries((os ?? []).map((o) => [o.id, o])));
        }
      });
  }, []);

  const total = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);

  function exportCsv() {
    const rows = [["Order", "Provider Ref", "Amount", "Status", "Date"]];
    payments.forEach((p) => {
      rows.push([
        orders[p.order_id]?.order_number ?? p.order_id,
        p.provider_ref ?? "",
        String(p.amount),
        p.status,
        p.created_at,
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PortalShell title="Admin Portal" nav={NAV} requireRole="admin">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finance</h1>
        <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      </div>

      <Card className="mb-6 p-5">
        <div className="text-sm text-muted-foreground">Lifetime revenue (paid)</div>
        <div className="mt-1 text-3xl font-bold">RM{total.toFixed(2)}</div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Transactions</h2>
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <div className="font-medium">{orders[p.order_id]?.order_number ?? p.order_id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">{p.provider_ref}</div>
              </div>
              <div className="flex items-center gap-3">
                <span>RM{Number(p.amount).toFixed(2)}</span>
                <Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {payments.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
        </div>
      </Card>
    </PortalShell>
  );
}
