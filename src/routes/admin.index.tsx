import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STAGE_LABEL } from "@/lib/stages";
import { RoleGuard } from "@/components/RoleGuard";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: () => <RoleGuard allow={["admin"]}><AdminHome /></RoleGuard>,
});

const NAV = [
  { to: "/admin", label: "Operations" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/finance", label: "Finance" },
  { to: "/admin/config", label: "Configuration" },
];

function AdminHome() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [releaseQueue, setReleaseQueue] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);

  async function load() {
    const [ordersRes, rqRes, exRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, stage, total, created_at, delivery_type")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("order_samples")
        .select("id, sample_label, order_id, qa_verified_at")
        .eq("stage", "ready_for_release"),
      supabase
        .from("exceptions")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false }),
    ]);
    setOrders(ordersRes.data ?? []);
    const c: Record<string, number> = {};
    (ordersRes.data ?? []).forEach((o) => (c[o.stage] = (c[o.stage] ?? 0) + 1));
    setCounts(c);
    setReleaseQueue(rqRes.data ?? []);
    setExceptions(exRes.data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function releaseSample(sampleId: string, orderId: string) {
    if (!user) return;
    await supabase.from("order_samples").update({ stage: "released" }).eq("id", sampleId);
    await supabase.from("chain_of_custody_events").insert({
      order_id: orderId,
      sample_id: sampleId,
      actor_id: user.id,
      event_type: "release",
      description: "Released by admin",
    });
    // If all samples in order are released, move order to released
    const { data: rest } = await supabase
      .from("order_samples").select("stage").eq("order_id", orderId);
    if ((rest ?? []).every((s) => s.stage === "released" || s.stage === "rejected")) {
      await supabase.from("orders").update({
        stage: "released",
        released_by: user.id,
        released_at: new Date().toISOString(),
      }).eq("id", orderId);
    }
    toast.success("Released to customer");
    load();
  }

  async function resolveException(id: string, status: "approved" | "rejected") {
    if (!user) return;
    await supabase.from("exceptions").update({
      status, resolved_by: user.id, resolved_at: new Date().toISOString(),
    }).eq("id", id);
    toast.success("Exception " + status);
    load();
  }

  const stages = ["ordered", "paid", "in_transit", "received_at_lab", "in_testing", "qa_review", "ready_for_release", "released"];

  return (
    <PortalShell title="Admin Portal" nav={NAV} requireRole="admin">
      <h1 className="mb-6 text-2xl font-bold"><SplitText>Operations</SplitText></h1>

      <div className="mb-6 grid gap-3 md:grid-cols-4 lg:grid-cols-8">
        {stages.map((s) => (
          <Card key={s} className="p-4">
            <div className="text-xs text-muted-foreground">{STAGE_LABEL[s]}</div>
            <div className="mt-1 text-2xl font-bold">{counts[s] ?? 0}</div>
          </Card>
        ))}
      </div>

      {releaseQueue.length > 0 && (
        <Card className="mb-6 border-primary/30 bg-primary/5 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" /> Release queue ({releaseQueue.length})
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Samples ready for release. Admin must approve to publish report to the customer portal.
          </p>
          <div className="space-y-2">
            {releaseQueue.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border bg-background p-3 text-sm">
                <div>
                  <div className="font-medium">{s.sample_label}</div>
                  <div className="text-xs text-muted-foreground">
                    QA verified {s.qa_verified_at ? new Date(s.qa_verified_at).toLocaleString() : "—"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to="/portal/orders/$orderId" params={{ orderId: s.order_id }}>
                    <Button size="sm" variant="outline">Review</Button>
                  </Link>
                  <Button size="sm" onClick={() => releaseSample(s.id, s.order_id)}>Release</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {exceptions.length > 0 && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Open exceptions ({exceptions.length})
          </h2>
          <div className="space-y-2">
            {exceptions.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-md border bg-background p-3 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{e.reason}</div>
                  <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => resolveException(e.id, "approved")}>Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => resolveException(e.id, "rejected")}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
                  <span>RM{Number(o.total).toFixed(2)}</span>
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
