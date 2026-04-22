import { SplitText } from "@/components/ui/split-text";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Save, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { getLalamoveQuote, bookLalamove, processRazorpayPayment } from "@/lib/mock-services";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/portal/new")({
  component: () => <RoleGuard allow={["customer"]}><NewOrder /></RoleGuard>,
});

const NAV = [
  { to: "/portal", label: "My orders" },
  { to: "/portal/new", label: "New order" },
  { to: "/portal/support", label: "Support" },
];

interface SampleRow {
  product_id: string;
  template_id: string | null;
  sample_label: string;
  batch_no: string;
  origin: string;
  composition: string;
}

const SAME_DAY_CUTOFF_HOUR = 12; // 12:00 PM local

function NewOrder() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [panels, setPanels] = useState<any[]>([]);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("CD Agrovet Lab, Klang");
  const [delivery, setDelivery] = useState<"same_day" | "standard">("standard");
  const [notes, setNotes] = useState("");
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [quote, setQuote] = useState<{ amount: number; etaMinutes: number; quoteId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [panelName, setPanelName] = useState("");

  useEffect(() => {
    supabase.from("products").select("*").eq("active", true).then(({ data }) => setProducts(data ?? []));
    supabase.from("test_templates").select("*").eq("active", true).then(({ data }) => setTemplates(data ?? []));
    if (user) {
      supabase.from("saved_test_panels").select("*").eq("customer_id", user.id).then(({ data }) => setPanels(data ?? []));
    }
  }, [user]);

  // Same-day cutoff guard
  const sameDayBlocked = (() => {
    if (delivery !== "same_day") return false;
    const now = new Date();
    return now.getHours() >= SAME_DAY_CUTOFF_HOUR;
  })();

  function addSample() {
    if (!products[0]) return;
    setSamples((s) => [
      ...s,
      {
        product_id: products[0].id,
        template_id: null,
        sample_label: `Sample ${s.length + 1}`,
        batch_no: "",
        origin: "",
        composition: "",
      },
    ]);
  }

  function updateSample(i: number, patch: Partial<SampleRow>) {
    setSamples((s) => s.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function removeSample(i: number) {
    setSamples((s) => s.filter((_, idx) => idx !== i));
  }

  async function savePanel() {
    if (!user || samples.length === 0) return toast.error("Add samples first");
    if (!panelName.trim()) return toast.error("Panel name required");
    const items = samples.map((s) => ({
      product_id: s.product_id,
      template_id: s.template_id,
      sample_label: s.sample_label,
    }));
    const { data, error } = await supabase
      .from("saved_test_panels")
      .insert({ customer_id: user.id, name: panelName.trim(), items })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setPanels((p) => [...p, data]);
    setPanelName("");
    toast.success("Panel saved");
  }

  function loadPanel(panelId: string) {
    const p = panels.find((x) => x.id === panelId);
    if (!p) return;
    const loaded: SampleRow[] = (p.items ?? []).map((it: any, i: number) => ({
      product_id: it.product_id,
      template_id: it.template_id ?? null,
      sample_label: it.sample_label ?? `Sample ${i + 1}`,
      batch_no: "",
      origin: "",
      composition: "",
    }));
    setSamples(loaded);
    toast.success(`Loaded "${p.name}"`);
  }

  const subtotal = samples.reduce((sum, s) => {
    const p = products.find((pr) => pr.id === s.product_id);
    return sum + (p ? Number(p.base_price) : 0);
  }, 0);
  const total = subtotal + (quote?.amount ?? 0);

  async function fetchQuote() {
    if (!pickup) return toast.error("Pickup address required");
    if (sameDayBlocked) return toast.error(`Same-day cutoff is ${SAME_DAY_CUTOFF_HOUR}:00. Choose Standard.`);
    setBusy(true);
    const q = await getLalamoveQuote({ pickup, dropoff, deliveryType: delivery });
    setQuote(q);
    setBusy(false);
    toast.success(`Quote: RM${q.amount} · ETA ${q.etaMinutes}m`);
  }

  async function placeOrder() {
    const { data: sessionData } = await supabase.auth.getSession();
    const authedUser = sessionData.session?.user;
    if (!authedUser) {
      toast.error("Please sign in again to place this order");
      nav({ to: "/auth" });
      return;
    }
    if (samples.length === 0) return toast.error("Add at least one sample");
    if (!quote) return toast.error("Get a delivery quote first");
    if (sameDayBlocked) return toast.error("Same-day no longer available today");
    setBusy(true);
    try {
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          customer_id: authedUser.id,
          delivery_type: delivery,
          pickup_address: pickup,
          delivery_address: dropoff,
          notes,
          subtotal,
          delivery_fee: quote.amount,
          total,
          stage: "ordered",
        })
        .select()
        .single();
      if (oErr || !order) throw oErr ?? new Error("Order creation failed");

      const sampleRows = samples.map((s) => ({
        order_id: order.id,
        product_id: s.product_id,
        template_id: s.template_id,
        sample_label: s.sample_label,
        batch_no: s.batch_no || null,
        origin: s.origin || null,
        composition: s.composition || null,
      }));
      const { error: sErr } = await supabase.from("order_samples").insert(sampleRows);
      if (sErr) throw sErr;

      const pay = await processRazorpayPayment(total);
      await supabase.from("payments").insert({
        order_id: order.id,
        amount: total,
        status: pay.status,
        provider_ref: pay.paymentId,
        paid_at: new Date().toISOString(),
      });

      const booking = await bookLalamove(quote.quoteId);
      await supabase.from("shipments").insert({
        order_id: order.id,
        tracking_id: booking.trackingId,
        quote_amount: quote.amount,
        eta: new Date(Date.now() + quote.etaMinutes * 60_000).toISOString(),
        status: "scheduled",
      });

      await supabase.from("orders").update({ stage: "paid" }).eq("id", order.id);
      await supabase.from("chain_of_custody_events").insert([
        { order_id: order.id, actor_id: authedUser.id, event_type: "ordered", description: "Order placed" },
        { order_id: order.id, actor_id: authedUser.id, event_type: "paid", description: `Payment ${pay.paymentId}` },
        { order_id: order.id, actor_id: authedUser.id, event_type: "shipment_booked", description: `Lalamove ${booking.trackingId}` },
      ]);

      toast.success("Order placed!");
      nav({ to: "/portal/orders/$orderId", params: { orderId: order.id } });
    } catch (e: any) {
      console.error("placeOrder failed:", e);
      toast.error(e?.message ?? e?.error_description ?? "Failed to place order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell title="Customer Portal" nav={NAV}>
      <h1 className="mb-6 text-2xl font-bold"><SplitText>New order</SplitText></h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {panels.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <Bookmark className="h-4 w-4" /> Saved test panels — 1-click reorder
              </h2>
              <div className="flex flex-wrap gap-2">
                {panels.map((p) => (
                  <Button key={p.id} size="sm" variant="outline" onClick={() => loadPanel(p.id)}>
                    {p.name} ({(p.items ?? []).length})
                  </Button>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Samples & material details</h2>
            </div>
            <div className="space-y-4">
              {samples.map((s, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <div className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-3"
                      placeholder="Label"
                      value={s.sample_label}
                      onChange={(e) => updateSample(i, { sample_label: e.target.value })}
                    />
                    <Select value={s.product_id} onValueChange={(v) => updateSample(i, { product_id: v })}>
                      <SelectTrigger className="col-span-5"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-80">
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            [{p.category}] {p.name} — RM{p.base_price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={s.template_id ?? "none"}
                      onValueChange={(v) => updateSample(i, { template_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="col-span-3"><SelectValue placeholder="Template" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No template</SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => removeSample(i)} className="col-span-1">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="Batch / lot no." value={s.batch_no} onChange={(e) => updateSample(i, { batch_no: e.target.value })} />
                    <Input placeholder="Origin (mill / site)" value={s.origin} onChange={(e) => updateSample(i, { origin: e.target.value })} />
                    <Input placeholder="Composition / notes" value={s.composition} onChange={(e) => updateSample(i, { composition: e.target.value })} />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addSample}><Plus className="mr-2 h-4 w-4" />Add sample</Button>
            </div>

            {samples.length > 0 && (
              <div className="mt-4 flex items-end gap-2 border-t pt-4">
                <div className="flex-1">
                  <Label className="text-xs">Save as panel for next time</Label>
                  <Input value={panelName} onChange={(e) => setPanelName(e.target.value)} placeholder="e.g. Monthly NPK panel" />
                </div>
                <Button variant="outline" onClick={savePanel}><Save className="mr-2 h-4 w-4" />Save panel</Button>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Logistics</h2>
            <div className="space-y-3">
              <div>
                <Label>Pickup address</Label>
                <Input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Your address" />
              </div>
              <div>
                <Label>Drop-off (lab)</Label>
                <Input value={dropoff} onChange={(e) => setDropoff(e.target.value)} />
              </div>
              <div>
                <Label>Service lane</Label>
                <RadioGroup value={delivery} onValueChange={(v) => { setDelivery(v as any); setQuote(null); }} className="flex gap-6 pt-1">
                  <label className="flex items-center gap-2"><RadioGroupItem value="standard" />Standard (nationwide courier)</label>
                  <label className="flex items-center gap-2"><RadioGroupItem value="same_day" />Same-day (Klang Valley, before {SAME_DAY_CUTOFF_HOUR}:00)</label>
                </RadioGroup>
                {sameDayBlocked && (
                  <p className="mt-1 text-xs text-destructive">Same-day cutoff has passed. Choose Standard.</p>
                )}
              </div>
              <Button variant="outline" onClick={fetchQuote} disabled={busy || sameDayBlocked}>Get Lalamove quote</Button>
              {quote && (
                <div className="text-sm text-muted-foreground">
                  Quote {quote.quoteId}: RM{quote.amount} · ETA {quote.etaMinutes} min
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
          </Card>
        </div>

        <Card className="h-fit p-5">
          <h2 className="mb-3 font-semibold">Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Samples</span><span>RM{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Delivery</span><span>RM{(quote?.amount ?? 0).toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>RM{total.toFixed(2)}</span></div>
          </div>
          <Button className="mt-4 w-full" onClick={placeOrder} disabled={busy || samples.length === 0 || !quote}>
            Pay & place order
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">Razorpay (mocked in Phase 1).</p>
        </Card>
      </div>
    </PortalShell>
  );
}
