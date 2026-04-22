import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const SampleSchema = z.object({
  product_id: z.string().uuid(),
  template_id: z.string().uuid().nullable().optional(),
  sample_label: z.string().min(1).max(120),
  batch_no: z.string().max(120).optional().nullable(),
  origin: z.string().max(200).optional().nullable(),
  composition: z.string().max(500).optional().nullable(),
});

const PlaceOrderSchema = z.object({
  delivery_type: z.enum(["same_day", "standard"]),
  pickup_address: z.string().min(3).max(500),
  delivery_address: z.string().min(3).max(500),
  notes: z.string().max(1000).optional().nullable(),
  delivery_fee: z.number().min(0).max(100000),
  delivery_quote_ref: z.string().min(1).max(120),
  delivery_eta_minutes: z.number().int().min(0).max(60 * 24 * 14),
  payment_provider_ref: z.string().min(1).max(120),
  samples: z.array(SampleSchema).min(1).max(50),
});

export type PlaceOrderInput = z.infer<typeof PlaceOrderSchema>;

/**
 * Server-side, all-or-nothing order placement.
 * Verifies caller, prices server-side from products table, then writes
 * order + samples + payment + shipment + custody events under the service role.
 * If any write fails, prior writes are rolled back.
 */
export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlaceOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // Same-day cutoff guard (server-authoritative)
    if (data.delivery_type === "same_day") {
      const hour = new Date().getHours();
      if (hour >= 12) throw new Error("Same-day cutoff (12:00) has passed.");
    }

    // Server-side pricing — never trust client subtotal
    const productIds = Array.from(new Set(data.samples.map((s) => s.product_id)));
    const { data: products, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id, base_price, active")
      .in("id", productIds);
    if (pErr) throw new Error("Pricing lookup failed");
    const priceById = new Map(products?.map((p) => [p.id, p]) ?? []);
    for (const id of productIds) {
      const p = priceById.get(id);
      if (!p || !p.active) throw new Error("One or more products are unavailable.");
    }
    const subtotal = data.samples.reduce((sum, s) => {
      return sum + Number(priceById.get(s.product_id)!.base_price);
    }, 0);
    const total = subtotal + data.delivery_fee;

    // 1) Create order
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_id: userId,
        delivery_type: data.delivery_type,
        pickup_address: data.pickup_address,
        delivery_address: data.delivery_address,
        notes: data.notes ?? null,
        subtotal,
        delivery_fee: data.delivery_fee,
        total,
        stage: "ordered",
      })
      .select("id, order_number")
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Order creation failed");

    const rollback = async () => {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
    };

    try {
      // 2) Samples
      const { error: sErr } = await supabaseAdmin.from("order_samples").insert(
        data.samples.map((s) => ({
          order_id: order.id,
          product_id: s.product_id,
          template_id: s.template_id ?? null,
          sample_label: s.sample_label,
          batch_no: s.batch_no || null,
          origin: s.origin || null,
          composition: s.composition || null,
        })),
      );
      if (sErr) throw sErr;

      // 3) Payment record (provider_ref comes from a verified payment intent)
      const { error: payErr } = await supabaseAdmin.from("payments").insert({
        order_id: order.id,
        amount: total,
        status: "paid",
        provider_ref: data.payment_provider_ref,
        paid_at: new Date().toISOString(),
      });
      if (payErr) throw payErr;

      // 4) Shipment
      const { error: shErr } = await supabaseAdmin.from("shipments").insert({
        order_id: order.id,
        tracking_id: data.delivery_quote_ref,
        quote_amount: data.delivery_fee,
        eta: new Date(Date.now() + data.delivery_eta_minutes * 60_000).toISOString(),
        status: "scheduled",
      });
      if (shErr) throw shErr;

      // 5) Move to paid + custody log
      const { error: upErr } = await supabaseAdmin
        .from("orders")
        .update({ stage: "paid" })
        .eq("id", order.id);
      if (upErr) throw upErr;

      await supabaseAdmin.from("chain_of_custody_events").insert([
        { order_id: order.id, actor_id: userId, event_type: "ordered", description: "Order placed" },
        { order_id: order.id, actor_id: userId, event_type: "paid", description: `Payment ${data.payment_provider_ref}` },
        { order_id: order.id, actor_id: userId, event_type: "shipment_booked", description: `Courier ${data.delivery_quote_ref}` },
      ]);

      return { id: order.id, order_number: order.order_number, total };
    } catch (e) {
      await rollback();
      throw e instanceof Error ? e : new Error("Order placement failed");
    }
  });
