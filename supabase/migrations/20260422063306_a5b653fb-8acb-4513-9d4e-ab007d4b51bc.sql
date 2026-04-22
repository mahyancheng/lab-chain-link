-- 1. Extend sample_stage enum
ALTER TYPE public.sample_stage ADD VALUE IF NOT EXISTS 'sample_prep' BEFORE 'in_testing';
ALTER TYPE public.sample_stage ADD VALUE IF NOT EXISTS 'data_validation' AFTER 'in_testing';

-- 2. Extend order_stage enum
ALTER TYPE public.order_stage ADD VALUE IF NOT EXISTS 'ready_for_release' BEFORE 'released';

-- 3. Add intake disposition enum
DO $$ BEGIN
  CREATE TYPE public.intake_disposition AS ENUM ('accepted', 'on_hold', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Extend order_samples with material + intake fields
ALTER TABLE public.order_samples
  ADD COLUMN IF NOT EXISTS batch_no text,
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS composition text,
  ADD COLUMN IF NOT EXISTS intake_weight_g numeric,
  ADD COLUMN IF NOT EXISTS intake_condition text,
  ADD COLUMN IF NOT EXISTS intake_disposition public.intake_disposition,
  ADD COLUMN IF NOT EXISTS intake_notes text,
  ADD COLUMN IF NOT EXISTS intake_by uuid,
  ADD COLUMN IF NOT EXISTS intake_at timestamptz;

-- 5. Extend orders with release tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS released_by uuid,
  ADD COLUMN IF NOT EXISTS released_at timestamptz;

-- 6. Saved test panels
CREATE TABLE IF NOT EXISTS public.saved_test_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_test_panels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "panels owner all" ON public.saved_test_panels;
CREATE POLICY "panels owner all" ON public.saved_test_panels
  FOR ALL USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "panels staff read" ON public.saved_test_panels;
CREATE POLICY "panels staff read" ON public.saved_test_panels
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE TRIGGER set_panels_updated_at BEFORE UPDATE ON public.saved_test_panels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_samples_stage ON public.order_samples(stage);
CREATE INDEX IF NOT EXISTS idx_orders_stage ON public.orders(stage);
CREATE INDEX IF NOT EXISTS idx_custody_order ON public.chain_of_custody_events(order_id, created_at);