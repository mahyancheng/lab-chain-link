// Thin client-side wrapper around server functions in src/server/order-flow.ts.
// Backed by mocks today; swap server-fn handlers for real Lalamove/Razorpay later — no UI changes needed.

import {
  getLalamoveQuoteFn,
  bookLalamoveFn,
  createRazorpayOrderFn,
  confirmRazorpayPaymentFn,
} from "@/server/order-flow";

export interface LalamoveQuote {
  quoteId: string;
  amount: number;
  currency: string;
  etaMinutes: number;
  // extra fields needed for booking later
  serviceType: string;
  senderStopId: string;
  recipientStopId: string;
  expiresAt: string;
}

export async function getLalamoveQuote(params: {
  pickup: string;
  dropoff: string;
  deliveryType: "same_day" | "standard";
}): Promise<LalamoveQuote> {
  // Map old "same_day"/"standard" to a Lalamove service type
  const serviceType = params.deliveryType === "same_day" ? "MOTORCYCLE" : "VAN";
  const r = await getLalamoveQuoteFn({
    data: { pickup: params.pickup, dropoff: params.dropoff, serviceType },
  });
  return {
    quoteId: r.quotationId,
    amount: r.priceTotal,
    currency: r.currency,
    etaMinutes: r.etaMinutes,
    serviceType: r.serviceType,
    senderStopId: r.senderStopId,
    recipientStopId: r.recipientStopId,
    expiresAt: r.expiresAt,
  };
}

export async function bookLalamove(
  quoteOrId: string | LalamoveQuote,
  contact?: {
    senderName: string;
    senderPhone: string;
    recipientName: string;
    recipientPhone: string;
  },
): Promise<{ trackingId: string }> {
  // Backward-compat: if called with just a quoteId string, fall back to mock-shaped tracking id
  if (typeof quoteOrId === "string") {
    return { trackingId: "LMTRK-" + quoteOrId.slice(-6) };
  }
  const r = await bookLalamoveFn({
    data: {
      quotationId: quoteOrId.quoteId,
      senderStopId: quoteOrId.senderStopId,
      recipientStopId: quoteOrId.recipientStopId,
      senderName: contact?.senderName ?? "Customer",
      senderPhone: contact?.senderPhone ?? "+60123456789",
      recipientName: contact?.recipientName ?? "CD Agrovet Lab",
      recipientPhone: contact?.recipientPhone ?? "+60311112222",
    },
  });
  return { trackingId: r.trackingId };
}

export interface RazorpayResult {
  paymentId: string;
  status: "paid" | "failed";
  amount: number;
  razorpayOrderId: string;
  signature: string;
}

export async function processRazorpayPayment(
  amount: number,
  supabaseOrderId?: string,
): Promise<RazorpayResult> {
  // Step 1: create Razorpay order
  const created = await createRazorpayOrderFn({
    data: { amount, supabaseOrderId: supabaseOrderId ?? crypto.randomUUID() },
  });
  // Step 2: in real flow, open checkout.js modal. Mock: directly call confirm.
  const confirmed = await confirmRazorpayPaymentFn({
    data: {
      razorpayOrderId: created.razorpayOrderId,
      supabaseOrderId: supabaseOrderId ?? crypto.randomUUID(),
      mockApprove: true,
    },
  });
  return {
    paymentId: confirmed.paymentId,
    status: confirmed.verified ? "paid" : "failed",
    amount,
    razorpayOrderId: created.razorpayOrderId,
    signature: confirmed.signature,
  };
}
