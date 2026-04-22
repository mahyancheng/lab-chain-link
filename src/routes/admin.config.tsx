import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import { Plus, Search, Pencil } from "lucide-react";

export const Route = createFileRoute("/admin/config")({
  component: () => (
    <RoleGuard allow={["admin"]}>
      <Config />
    </RoleGuard>
  ),
});

const NAV = [
  { to: "/admin", label: "Operations" },
  { to: "/admin/finance", label: "Finance" },
  { to: "/admin/config", label: "Configuration" },
];

type Product = {
  id?: string;
  name: string;
  item_code: string | null;
  category: string;
  description: string | null;
  base_price: number;
  tat_days: number | null;
  sample_solid: string | null;
  sample_liquid: string | null;
  packaging_instructions: string | null;
  active: boolean;
};

const EMPTY: Product = {
  name: "",
  item_code: "",
  category: "",
  description: "",
  base_price: 0,
  tat_days: null,
  sample_solid: "",
  sample_liquid: "",
  packaging_instructions: "",
  active: true,
};

function Config() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").order("name");
    if (error) toast.error(error.message);
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.item_code ?? "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    filtered.forEach((p) => {
      const k = p.category || "Uncategorised";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  async function save() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.category.trim()) {
      toast.error("Name and category are required");
      return;
    }
    setSaving(true);
    const payload = {
      name: editing.name.trim(),
      item_code: editing.item_code?.trim() || null,
      category: editing.category.trim(),
      description: editing.description?.trim() || null,
      base_price: Number(editing.base_price) || 0,
      tat_days: editing.tat_days != null && editing.tat_days !== ("" as any) ? Number(editing.tat_days) : null,
      sample_solid: editing.sample_solid?.trim() || null,
      sample_liquid: editing.sample_liquid?.trim() || null,
      packaging_instructions: editing.packaging_instructions?.trim() || null,
      active: editing.active,
    };
    const res = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(editing.id ? "Product updated" : "Product created");
    setEditing(null);
    load();
  }

  return (
    <PortalShell title="Admin Portal" nav={NAV} requireRole="admin">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pricing & Tests</h1>
          <p className="text-sm text-muted-foreground">
            Click any test to edit its price, TAT, sample requirements, and packaging.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="mr-2 h-4 w-4" />
          New test
        </Button>
      </div>

      <Card className="mb-4 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, item code, or category"
            className="pl-9"
          />
        </div>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : grouped.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No tests found.</Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([cat, items]) => (
            <div key={cat}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {cat} <span className="ml-2 text-xs">({items.length})</span>
              </h2>
              <Card className="divide-y">
                {items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setEditing({ ...p })}
                    className="group flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{p.name}</span>
                        {p.item_code && (
                          <span className="font-mono text-xs text-muted-foreground">{p.item_code}</span>
                        )}
                        {!p.active && <Badge variant="outline">Inactive</Badge>}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {p.tat_days ? `TAT ${p.tat_days}d` : "TAT —"}
                        {p.sample_solid ? ` · Solid: ${p.sample_solid}` : ""}
                        {p.sample_liquid ? ` · Liquid: ${p.sample_liquid}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold tabular-nums">
                        RM{Number(p.base_price).toFixed(2)}
                      </span>
                      <Pencil className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit test" : "New test"}</DialogTitle>
            <DialogDescription>
              Update pricing, turnaround time, and sample handling for this test.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Test name *</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Item code</Label>
                  <Input
                    value={editing.item_code ?? ""}
                    onChange={(e) => setEditing({ ...editing, item_code: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Category *</Label>
                  <Input
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    placeholder="e.g. Microbiology, Chemistry"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Price (RM) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editing.base_price}
                    onChange={(e) =>
                      setEditing({ ...editing, base_price: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>TAT (days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editing.tat_days ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        tat_days: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Solid sample</Label>
                  <Input
                    value={editing.sample_solid ?? ""}
                    onChange={(e) => setEditing({ ...editing, sample_solid: e.target.value })}
                    placeholder="e.g. 100g"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Liquid sample</Label>
                  <Input
                    value={editing.sample_liquid ?? ""}
                    onChange={(e) => setEditing({ ...editing, sample_liquid: e.target.value })}
                    placeholder="e.g. 250ml"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Packaging instructions</Label>
                <Textarea
                  rows={3}
                  value={editing.packaging_instructions ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, packaging_instructions: e.target.value })
                  }
                  placeholder="How the customer should pack and label the sample."
                />
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-muted-foreground">
                    Inactive tests are hidden from customers.
                  </div>
                </div>
                <Switch
                  checked={editing.active}
                  onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}
