
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS lalamove_quotation_id text,
  ADD COLUMN IF NOT EXISTS lalamove_sender_stop_id text,
  ADD COLUMN IF NOT EXISTS lalamove_recipient_stop_id text,
  ADD COLUMN IF NOT EXISTS pickup_lat text,
  ADD COLUMN IF NOT EXISTS pickup_lng text,
  ADD COLUMN IF NOT EXISTS delivery_lat text,
  ADD COLUMN IF NOT EXISTS delivery_lng text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_signature text;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS lalamove_quotation_id text,
  ADD COLUMN IF NOT EXISTS service_type text;
