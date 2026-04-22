import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/admin/config")({
  component: () => <RoleGuard allow={["admin"]}><Config /></RoleGuard>,
});

const NAV = [
  { to: "/admin", label: "Operations" },
  { to: "/admin/finance", label: "Finance" },
  { to: "/admin/config", label: "Configuration" },
  { to: "/lab", label: "Lab workspace" },
];

function Config() {
  const [products, setProducts] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [roleEmail, setRoleEmail] = useState("");
  const [roleValue, setRoleValue] = useState<"lab" | "admin">("lab");

  async function load() {
    const { data: p } = await supabase.from("products").select("*").order("name");
    setProducts(p ?? []);
    const { data: r } = await supabase.from("capacity_rules").select("*").order("created_at");
    setRules(r ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function addRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const dt = (fd.get("delivery_type") as string) || "";
    const { error } = await supabase.from("capacity_rules").insert({
      delivery_type: dt === "same_day" || dt === "standard" ? dt : null,
      daily_cap: fd.get("daily_cap") ? Number(fd.get("daily_cap")) : null,
      same_day_cutoff_time: (fd.get("cutoff") as string) || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Rule added");
      load();
      (e.currentTarget as HTMLFormElement).reset();
    }
  }

  async function assignRole() {
    if (!roleEmail) return;
    // Look up user by email via profiles join is not directly possible; require user UUID instead in Phase 1
    toast.message("Phase 1: paste the user's UUID below. (Email lookup needs an admin function.)");
  }

  async function assignByUuid(uuid: string) {
    const { error } = await supabase.from("user_roles").insert({ user_id: uuid, role: roleValue });
    if (error) toast.error(error.message);
    else toast.success("Role assigned");
  }

  return (
    <PortalShell title="Admin Portal" nav={NAV} requireRole="admin">
      <h1 className="mb-6 text-2xl font-bold">Configuration</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Products</h2>
          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="flex justify-between rounded-md border p-3 text-sm">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.category}</div>
                </div>
                <div>₹{Number(p.base_price).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Capacity rules</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Default is unlimited. Add caps only when needed.
          </p>
          <form onSubmit={addRule} className="grid grid-cols-3 gap-2">
            <Select name="delivery_type" defaultValue="">
              <SelectTrigger><SelectValue placeholder="Delivery type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="same_day">Same-day</SelectItem>
              </SelectContent>
            </Select>
            <Input name="daily_cap" type="number" placeholder="Daily cap" />
            <Input name="cutoff" type="time" placeholder="Cutoff" />
            <Button type="submit" className="col-span-3">Add rule</Button>
          </form>
          <div className="mt-3 space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="rounded-md border p-2 text-sm">
                {r.delivery_type ?? "any"} · cap {r.daily_cap ?? "∞"} · cutoff {r.same_day_cutoff_time ?? "—"}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Assign role</h2>
          <div className="grid gap-2 md:grid-cols-3">
            <Input placeholder="User email (lookup not implemented)" value={roleEmail} onChange={(e) => setRoleEmail(e.target.value)} />
            <Select value={roleValue} onValueChange={(v) => setRoleValue(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lab">Lab</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={assignRole}>Assign</Button>
          </div>
          <div className="mt-3">
            <Label>Or assign by user UUID</Label>
            <div className="flex gap-2 pt-1">
              <Input id="uuid" placeholder="user uuid" />
              <Button
                onClick={() => {
                  const v = (document.getElementById("uuid") as HTMLInputElement).value;
                  if (v) assignByUuid(v);
                }}
              >
                Assign by UUID
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PortalShell>
  );
}
