import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { RoleGuard } from "@/components/RoleGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupportChat } from "@/components/SupportChat";
import { OrderListRow } from "@/components/OrderListRow";
import { STAGE_LABEL } from "@/lib/stages";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, AlertTriangle, Building2, Phone, User } from "lucide-react";
import { SplitText } from "@/components/ui/split-text";

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
  { to: "/admin/customers", label: "Customers" },
];

export const Route = createFileRoute("/admin/customers/$customerId")({
  component: () => (
    <RoleGuard allow={["admin", "lab"]}>
      <CustomerDetail />
    </RoleGuard>
  ),
});

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", customerId)
        .maybeSingle();
      setProfile(p);

      const { data: ords } = await supabase
        .from("orders")
        .select("id, order_number, stage, total, delivery_type, created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      setOrders(ords ?? []);

      const orderIds = (ords ?? []).map((o) => o.id);
      if (orderIds.length > 0) {
        const [smp, ex] = await Promise.all([
          supabase
            .from("order_samples")
            .select("id, sample_label, stage, order_id, created_at")
            .in("order_id", orderIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("exceptions")
            .select("*")
            .in("order_id", orderIds)
            .order("created_at", { ascending: false }),
        ]);
        setSamples(smp.data ?? []);
        setExceptions(ex.data ?? []);
      } else {
        setSamples([]);
        setExceptions([]);
      }
    })();
  }, [customerId]);

  const totalSpend = orders
    .filter((o) => o.stage !== "cancelled")
    .reduce((s, o) => s + Number(o.total ?? 0), 0);
  const released = orders.filter((o) => o.stage === "released").length;
  const openEx = exceptions.filter((e) => e.status === "open").length;

  return (
    <PortalShell
      title={isAdmin ? "Admin Portal" : "Lab Workspace"}
      nav={isAdmin ? ADMIN_NAV : LAB_NAV}
      requireRole={isAdmin ? "admin" : "lab"}
    >
      <Link
        to="/admin/customers"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to customers
      </Link>

      <Card className="mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              <SplitText>{profile?.full_name ?? "Customer"}</SplitText>
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
              {profile?.company && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {profile.company}
                </span>
              )}
              {profile?.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {profile.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                Joined{" "}
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : "—"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
            <div className="rounded-lg border bg-card px-2 py-2 sm:px-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Orders
              </div>
              <div className="text-lg font-semibold sm:text-xl">{orders.length}</div>
            </div>
            <div className="rounded-lg border bg-card px-2 py-2 sm:px-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Released
              </div>
              <div className="text-lg font-semibold sm:text-xl">{released}</div>
            </div>
            <div className="rounded-lg border bg-card px-2 py-2 sm:px-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Spend
              </div>
              <div className="text-lg font-semibold sm:text-xl">RM{totalSpend.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(360px,420px)]">
        <div className="min-w-0">
          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
              <TabsTrigger value="samples">Samples ({samples.length})</TabsTrigger>
              <TabsTrigger value="issues">
                Issues
                {openEx > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">
                    {openEx}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="mt-4">
              {orders.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((o) => (
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
            </TabsContent>

            <TabsContent value="samples" className="mt-4">
              {samples.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No samples.</p>
              ) : (
                <Card className="divide-y">
                  {samples.map((s) => (
                    <Link
                      key={s.id}
                      to="/lab/samples/$sampleId"
                      params={{ sampleId: s.id }}
                      className="flex items-center justify-between px-4 py-3 text-sm hover:bg-accent/40"
                    >
                      <span className="font-medium">{s.sample_label}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {STAGE_LABEL[s.stage] ?? s.stage}
                      </Badge>
                    </Link>
                  ))}
                </Card>
              )}
            </TabsContent>

            <TabsContent value="issues" className="mt-4">
              {exceptions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No issues raised.
                </p>
              ) : (
                <div className="space-y-2">
                  {exceptions.map((e) => (
                    <Card key={e.id} className="flex items-start gap-3 p-3 text-sm">
                      <AlertTriangle
                        className={
                          e.status === "open"
                            ? "mt-0.5 h-4 w-4 shrink-0 text-destructive"
                            : "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                        }
                      />
                      <div className="flex-1">
                        <div className="font-medium">{e.reason}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(e.created_at).toLocaleString()} · {e.status}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="h-[600px] lg:sticky lg:top-20">
          <SupportChat customerId={customerId} customerName={profile?.full_name ?? undefined} />
        </div>
      </div>
    </PortalShell>
  );
}
