// Phase 1 mocks for Lalamove + Razorpay. Same interfaces will be wired to real APIs later.

export interface LalamoveQuote {
  quoteId: string;
  amount: number;
  currency: string;
  etaMinutes: number;
}

export async function getLalamoveQuote(params: {
  pickup: string;
  dropoff: string;
  deliveryType: "same_day" | "standard";
}): Promise<LalamoveQuote> {
  await new Promise((r) => setTimeout(r, 400));
  const base = params.deliveryType === "same_day" ? 350 : 180;
  const variance = Math.floor(Math.random() * 80);
  return {
    quoteId: "LM-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
    amount: base + variance,
    currency: "MYR",
    etaMinutes: params.deliveryType === "same_day" ? 90 : 24 * 60,
  };
}

export async function bookLalamove(quoteId: string): Promise<{ trackingId: string }> {
  await new Promise((r) => setTimeout(r, 400));
  return { trackingId: "LMTRK-" + quoteId.slice(-6) };
}

export interface RazorpayResult {
  paymentId: string;
  status: "paid" | "failed";
  amount: number;
}

export async function processRazorpayPayment(amount: number): Promise<RazorpayResult> {
  await new Promise((r) => setTimeout(r, 800));
  return {
    paymentId: "rzp_mock_" + Math.random().toString(36).slice(2, 12),
    status: "paid",
    amount,
  };
}
