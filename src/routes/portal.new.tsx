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
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { getLalamoveQuote, bookLalamove, processRazorpayPayment } from "@/lib/mock-services";

export const Route = createFileRoute("/portal/new")({
  component: NewOrder,
});

const NAV = [
  { to: "/portal", label: "My orders" },
  { to: "/portal/new", label: "New order" },
];

interface SampleRow {
  product_id: string;
  template_id: string | null;
  sample_label: string;
}

function NewOrder() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("CD Agrovet Lab, Mumbai");
  const [delivery, setDelivery] = useState<"same_day" | "standard">("standard");
  const [notes, setNotes] = useState("");
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [quote, setQuote] = useState<{ amount: number; etaMinutes: number; quoteId: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("products").select("*").eq("active", true).then(({ data }) => setProducts(data ?? []));
    supabase.from("test_templates").select("*").eq("active", true).then(({ data }) => setTemplates(data ?? []));
  }, []);

  function addSample() {
    if (!products[0]) return;
    setSamples((s) => [
      ...s,
      { product_id: products[0].id, template_id: null, sample_label: `Sample ${s.length + 1}` },
    ]);
  }

  function updateSample(i: number, patch: Partial<SampleRow>) {
    setSamples((s) => s.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function removeSample(i: number) {
    setSamples((s) => s.filter((_, idx) => idx !== i));
  }

  const subtotal = samples.reduce((sum, s) => {
    const p = products.find((pr) => pr.id === s.product_id);
    return sum + (p ? Number(p.base_price) : 0);
  }, 0);
  const total = subtotal + (quote?.amount ?? 0);

  async function fetchQuote() {
    if (!pickup) return toast.error("Pickup address required");
    setBusy(true);
    const q = await getLalamoveQuote({ pickup, dropoff, deliveryType: delivery });
    setQuote(q);
    setBusy(false);
    toast.success(`Quote: ₹${q.amount} · ETA ${q.etaMinutes}m`);
  }

  async function placeOrder() {
    // Verify a live session exists — RLS requires auth.uid()
    const { data: sessionData } = await supabase.auth.getSession();
    const authedUser = sessionData.session?.user;
    if (!authedUser) {
      toast.error("Please sign in again to place this order");
      nav({ to: "/auth" });
      return;
    }
    if (samples.length === 0) return toast.error("Add at least one sample");
    if (!quote) return toast.error("Get a delivery quote first");
    setBusy(true);
    try {
      // 1. Create order
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

      // 2. Create samples
      const sampleRows = samples.map((s) => ({
        order_id: order.id,
        product_id: s.product_id,
        template_id: s.template_id,
        sample_label: s.sample_label,
      }));
      const { error: sErr } = await supabase.from("order_samples").insert(sampleRows);
      if (sErr) throw sErr;

      // 3. Mock payment
      const pay = await processRazorpayPayment(total);
      await supabase.from("payments").insert({
        order_id: order.id,
        amount: total,
        status: pay.status,
        provider_ref: pay.paymentId,
        paid_at: new Date().toISOString(),
      });

      // 4. Book shipment
      const booking = await bookLalamove(quote.quoteId);
      await supabase.from("shipments").insert({
        order_id: order.id,
        tracking_id: booking.trackingId,
        quote_amount: quote.amount,
        eta: new Date(Date.now() + quote.etaMinutes * 60_000).toISOString(),
        status: "scheduled",
      });

      // 5. Stage -> paid + custody events
      await supabase.from("orders").update({ stage: "paid" }).eq("id", order.id);
      await supabase.from("chain_of_custody_events").insert([
        { order_id: order.id, actor_id: user.id, event_type: "ordered", description: "Order placed" },
        { order_id: order.id, actor_id: user.id, event_type: "paid", description: `Payment ${pay.paymentId}` },
        { order_id: order.id, actor_id: user.id, event_type: "shipment_booked", description: `Lalamove ${booking.trackingId}` },
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
      <h1 className="mb-6 text-2xl font-bold">New order</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Samples</h2>
            <div className="space-y-3">
              {samples.map((s, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-3"
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
              ))}
              <Button variant="outline" onClick={addSample}><Plus className="mr-2 h-4 w-4" />Add sample</Button>
            </div>
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
                <Label>Delivery</Label>
                <RadioGroup value={delivery} onValueChange={(v) => { setDelivery(v as any); setQuote(null); }} className="flex gap-6 pt-1">
                  <label className="flex items-center gap-2"><RadioGroupItem value="standard" />Standard (next-day)</label>
                  <label className="flex items-center gap-2"><RadioGroupItem value="same_day" />Same-day</label>
                </RadioGroup>
              </div>
              <Button variant="outline" onClick={fetchQuote} disabled={busy}>Get Lalamove quote</Button>
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
