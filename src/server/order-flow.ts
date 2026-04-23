// Mock-shaped server functions matching real Lalamove v3 + Razorpay contracts.
// Swap the handler bodies for real fetch() calls when sandbox credentials arrive.
//
// Lalamove docs: POST /v3/quotations, POST /v3/orders (HMAC-SHA256 auth)
// Razorpay docs: POST /v1/orders, signature = HMAC_SHA256(secret, order_id + "|" + payment_id)

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Lalamove: get quote ----------
export interface LalamoveQuoteInput {
  pickup: string;
  dropoff: string;
  serviceType?: "MOTORCYCLE" | "CAR" | "VAN";
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  distanceKm?: number;
}

export interface LalamoveQuoteResult {
  quotationId: string;
  serviceType: string;
  priceTotal: number;
  currency: string;
  expiresAt: string;
  senderStopId: string;
  recipientStopId: string;
  etaMinutes: number;
}

export const getLalamoveQuoteFn = createServerFn({ method: "POST" })
  .inputValidator((input: LalamoveQuoteInput) => {
    if (!input?.pickup || !input?.dropoff) throw new Error("pickup and dropoff required");
    return {
      pickup: String(input.pickup),
      dropoff: String(input.dropoff),
      serviceType: (input.serviceType ?? "MOTORCYCLE") as "MOTORCYCLE" | "CAR" | "VAN",
      distanceKm: typeof input.distanceKm === "number" ? input.distanceKm : 5,
    };
  })
  .handler(async ({ data }): Promise<LalamoveQuoteResult> => {
    // MOCK: matches Lalamove /v3/quotations response shape. Distance-aware pricing.
    const perKm = data.serviceType === "VAN" ? 2.5 : data.serviceType === "CAR" ? 1.8 : 1.2;
    const flag = data.serviceType === "VAN" ? 12 : data.serviceType === "CAR" ? 8 : 5;
    const speedKmh = data.serviceType === "VAN" ? 35 : data.serviceType === "CAR" ? 40 : 45;
    const price = Math.max(8, Math.round((flag + perKm * data.distanceKm) * 100) / 100);
    const eta = Math.max(15, Math.round((data.distanceKm / speedKmh) * 60) + 10);
    const id = crypto.randomUUID().replace(/-/g, "");
    return {
      quotationId: "LMQ-" + id.slice(0, 12).toUpperCase(),
      serviceType: data.serviceType,
      priceTotal: price,
      currency: "MYR",
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      senderStopId: "stop_" + id.slice(0, 8),
      recipientStopId: "stop_" + id.slice(8, 16),
      etaMinutes: eta,
    };
  });

// ---------- Lalamove: place order (book delivery) ----------
export interface LalamoveBookInput {
  quotationId: string;
  senderStopId: string;
  recipientStopId: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
}

export const bookLalamoveFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: LalamoveBookInput) => {
    if (!input?.quotationId) throw new Error("quotationId required");
    return input;
  })
  .handler(async ({ data }) => {
    // MOCK: matches Lalamove /v3/orders response
    const orderId = "LMO-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
    return {
      orderId,
      trackingId: orderId,
      status: "ASSIGNING_DRIVER" as const,
      shareLink: `https://share.sandbox.lalamove.com/?orderid=${orderId}`,
    };
  });

// ---------- Razorpay: create order ----------
export interface CreateRazorpayOrderInput {
  amount: number; // in MYR (decimal)
  supabaseOrderId: string;
}

export const createRazorpayOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateRazorpayOrderInput) => {
    if (!input?.amount || input.amount <= 0) throw new Error("amount must be positive");
    if (!input?.supabaseOrderId) throw new Error("supabaseOrderId required");
    return { amount: Number(input.amount), supabaseOrderId: String(input.supabaseOrderId) };
  })
  .handler(async ({ data }) => {
    // MOCK: matches Razorpay /v1/orders response
    const id = "order_" + crypto.randomUUID().replace(/-/g, "").slice(0, 14);
    return {
      razorpayOrderId: id,
      amount: Math.round(data.amount * 100), // sen
      currency: "MYR",
      status: "created" as const,
      keyId: "rzp_test_mock_key",
      receipt: "rcpt_" + data.supabaseOrderId.slice(0, 8),
    };
  });

// ---------- Razorpay: confirm payment (verify signature server-side) ----------
export interface ConfirmPaymentInput {
  razorpayOrderId: string;
  supabaseOrderId: string;
  // In real flow: razorpayPaymentId + razorpaySignature passed from checkout.js handler
  mockApprove?: boolean;
}

export const confirmRazorpayPaymentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ConfirmPaymentInput) => {
    if (!input?.razorpayOrderId) throw new Error("razorpayOrderId required");
    if (!input?.supabaseOrderId) throw new Error("supabaseOrderId required");
    return input;
  })
  .handler(async ({ data }) => {
    // MOCK: simulate signature verification success.
    // Real impl: HMAC-SHA256(secret, razorpayOrderId + "|" + razorpayPaymentId)
    const paymentId = "pay_" + crypto.randomUUID().replace(/-/g, "").slice(0, 14);
    const signature = "sig_mock_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    return {
      verified: true,
      paymentId,
      signature,
      status: "captured" as const,
    };
  });
