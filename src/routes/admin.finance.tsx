import { SplitText } from "@/components/ui/split-text";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RoleGuard } from "@/components/RoleGuard";
import {
  ChevronRight, Search, Download, History, Library,
  ArrowDownRight, ArrowUpRight, Wallet, Receipt, TrendingUp,
  CreditCard, ShieldCheck, Target, Activity,
} from "lucide-react";

export const Route = createFileRoute("/admin/finance")({
  component: () => <RoleGuard allow={["admin"]}><Finance /></RoleGuard>,
});

const NAV = [
  { to: "/admin", label: "Operations" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/finance", label: "Finance" },
  { to: "/admin/config", label: "Configuration" },
];

const QUICK_ACTIONS = [
  { icon: Receipt, title: "Invoices", description: "Customer billing" },
  { icon: Wallet, title: "Payouts", description: "Bank transfers" },
  { icon: TrendingUp, title: "Revenue", description: "Trends & growth" },
  { icon: CreditCard, title: "Refunds", description: "Issue refunds" },
];

const SERVICES = [
  { icon: ShieldCheck, title: "Reconciliation", description: "Match payouts to orders", isPremium: true },
  { icon: Target, title: "Goals", description: "Monthly revenue targets", hasAction: true },
  { icon: Activity, title: "Anomaly alerts", description: "Flag unusual transactions" },
  { icon: Library, title: "Tax exports", description: "Quarterly statements" },
];

const container = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.06 } },
};
const item = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

function Finance() {
  const [payments, setPayments] = useState<any[]>([]);
  const [orders, setOrders] = useState<Record<string, any>>({});
  const [query, setQuery] = useState("");

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

  const paid = payments.filter((p) => p.status === "paid");
  const total = paid.reduce((s, p) => s + Number(p.amount), 0);
  const refunded = payments.filter((p) => p.status === "refunded").reduce((s, p) => s + Number(p.amount), 0);
  const pending = payments.filter((p) => p.status === "pending").length;

  const filtered = payments.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      orders[p.order_id]?.order_number?.toLowerCase().includes(q) ||
      (p.provider_ref ?? "").toLowerCase().includes(q) ||
      (p.status ?? "").toLowerCase().includes(q)
    );
  });

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
        <div>
          <h1 className="text-2xl font-bold"><SplitText>Finance</SplitText></h1>
          <p className="text-sm text-muted-foreground">
            <SplitText stagger={0.012}>Revenue, transactions, and financial services.</SplitText>
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      </div>

      {/* Top stats */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="mb-6 grid gap-3 md:grid-cols-3"
      >
        <motion.div variants={item}>
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Lifetime revenue</div>
            <div className="mt-1 text-3xl font-semibold">RM{total.toFixed(2)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{paid.length} paid transactions</div>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Refunded</div>
            <div className="mt-1 text-3xl font-semibold">RM{refunded.toFixed(2)}</div>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Pending</div>
            <div className="mt-1 text-3xl font-semibold">{pending}</div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 px-4 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by order, reference, or status…"
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
      </div>

      {/* Quick actions */}
      <motion.div variants={container} initial="hidden" animate="visible" className="mb-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <motion.div key={a.title} variants={item}>
            <Card className="cursor-pointer p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <a.icon className="h-4 w-4" />
              </div>
              <div className="mt-3 font-semibold">{a.title}</div>
              <div className="text-xs text-muted-foreground">{a.description}</div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent activity */}
      <Card className="mb-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold"><SplitText>Recent activity</SplitText></h2>
        </div>
        <div className="space-y-2">
          {filtered.slice(0, 12).map((p) => {
            const order = orders[p.order_id];
            const positive = p.status === "paid";
            const row = (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 p-3 transition-colors hover:bg-accent/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${positive ? "bg-primary/15 text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{order?.order_number ?? p.order_id.slice(0, 8)}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.provider_ref ?? p.provider}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium tabular-nums ${positive ? "text-primary" : "text-destructive"}`}>
                    {positive ? "+" : "−"}RM{Number(p.amount).toFixed(2)}
                  </span>
                  <Badge variant={positive ? "default" : "secondary"}>{p.status}</Badge>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{new Date(p.created_at).toLocaleDateString()}</span>
                  {order && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
            );
            return order ? (
              <Link key={p.id} to="/portal/orders/$orderId" params={{ orderId: p.order_id }} className="block">
                {row}
              </Link>
            ) : (
              <div key={p.id}>{row}</div>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No transactions match.</p>}
        </div>
      </Card>

      <Separator className="my-6" />

      {/* Financial services */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Library className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold"><SplitText>Financial services</SplitText></h2>
        </div>
        <motion.div variants={container} initial="hidden" animate="visible" className="grid gap-3 sm:grid-cols-2">
          {SERVICES.map((s) => (
            <motion.div key={s.title} variants={item}>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4 transition-colors hover:bg-accent/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {s.title}
                      {s.isPremium && <Badge variant="outline">Premium</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.description}</div>
                  </div>
                </div>
                {s.hasAction && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Card>
    </PortalShell>
  );
}
