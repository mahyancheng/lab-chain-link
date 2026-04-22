
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('customer', 'lab', 'admin');
CREATE TYPE public.delivery_type AS ENUM ('same_day', 'standard');
CREATE TYPE public.order_stage AS ENUM (
  'draft','ordered','paid','picked_up','in_transit',
  'received_at_lab','sample_verified','in_testing','qa_review','released','cancelled'
);
CREATE TYPE public.sample_stage AS ENUM (
  'pending','received','in_testing','qa_review','ready_for_release','released','rejected'
);
CREATE TYPE public.payment_status AS ENUM ('pending','paid','failed','refunded');
CREATE TYPE public.exception_status AS ENUM ('open','approved','rejected');
CREATE TYPE public.attachment_kind AS ENUM ('evidence','external_cert','report','packing_slip','invoice','other');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('lab','admin'))
$$;

-- Auto-create profile + default customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TEST TEMPLATES ============
CREATE TABLE public.test_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.test_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.test_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.test_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT,
  min_value NUMERIC,
  max_value NUMERIC,
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.test_parameters ENABLE ROW LEVEL SECURITY;

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('ORD-' || to_char(now(),'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6)),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  qr_code TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  delivery_type public.delivery_type NOT NULL DEFAULT 'standard',
  pickup_address TEXT,
  delivery_address TEXT,
  notes TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  stage public.order_stage NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  template_id UUID REFERENCES public.test_templates(id),
  sample_label TEXT NOT NULL,
  qr_code TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  stage public.sample_stage NOT NULL DEFAULT 'pending',
  qa_verified_by UUID REFERENCES auth.users(id),
  qa_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_samples ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_samples_updated BEFORE UPDATE ON public.order_samples FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'razorpay_mock',
  provider_ref TEXT,
  amount NUMERIC(10,2) NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============ SHIPMENTS ============
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'lalamove_mock',
  tracking_id TEXT,
  quote_amount NUMERIC(10,2),
  eta TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_shipments_updated BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CHAIN OF CUSTODY ============
CREATE TABLE public.chain_of_custody_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sample_id UUID REFERENCES public.order_samples(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chain_of_custody_events ENABLE ROW LEVEL SECURITY;

-- ============ TEST RESULTS ============
CREATE TABLE public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES public.order_samples(id) ON DELETE CASCADE,
  parameter_id UUID NOT NULL REFERENCES public.test_parameters(id),
  value NUMERIC,
  text_value TEXT,
  passed BOOLEAN,
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- ============ ATTACHMENTS ============
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  sample_id UUID REFERENCES public.order_samples(id) ON DELETE CASCADE,
  kind public.attachment_kind NOT NULL,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  filename TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- ============ CAPACITY RULES ============
CREATE TABLE public.capacity_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_type public.delivery_type,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  daily_cap INT,
  same_day_cutoff_time TIME,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.capacity_rules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_capacity_updated BEFORE UPDATE ON public.capacity_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ EXCEPTIONS ============
CREATE TABLE public.exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  sample_id UUID REFERENCES public.order_samples(id) ON DELETE CASCADE,
  raised_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status public.exception_status NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exceptions ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles staff read" ON public.profiles FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "roles admin all" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- products (public read, admin write)
CREATE POLICY "products read all" ON public.products FOR SELECT USING (true);
CREATE POLICY "products admin write" ON public.products FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- test_templates / parameters (signed-in read, admin write)
CREATE POLICY "templates read auth" ON public.test_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "templates admin write" ON public.test_templates FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "parameters read auth" ON public.test_parameters FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "parameters admin write" ON public.test_parameters FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- orders
CREATE POLICY "orders customer read own" ON public.orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "orders staff read" ON public.orders FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "orders customer insert" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "orders customer update own draft" ON public.orders FOR UPDATE USING (auth.uid() = customer_id AND stage IN ('draft','ordered'));
CREATE POLICY "orders staff update" ON public.orders FOR UPDATE USING (public.is_staff(auth.uid()));

-- order_samples
CREATE POLICY "samples customer read own" ON public.order_samples FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_samples.order_id AND o.customer_id = auth.uid())
);
CREATE POLICY "samples staff read" ON public.order_samples FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "samples customer insert" ON public.order_samples FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_samples.order_id AND o.customer_id = auth.uid())
);
CREATE POLICY "samples staff write" ON public.order_samples FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- payments
CREATE POLICY "payments customer read own" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND o.customer_id = auth.uid())
);
CREATE POLICY "payments staff read" ON public.payments FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "payments customer insert" ON public.payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND o.customer_id = auth.uid())
);
CREATE POLICY "payments staff write" ON public.payments FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- shipments
CREATE POLICY "shipments customer read own" ON public.shipments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = shipments.order_id AND o.customer_id = auth.uid())
);
CREATE POLICY "shipments staff read" ON public.shipments FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "shipments customer insert" ON public.shipments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = shipments.order_id AND o.customer_id = auth.uid())
);
CREATE POLICY "shipments staff write" ON public.shipments FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- custody events
CREATE POLICY "custody customer read own" ON public.chain_of_custody_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = chain_of_custody_events.order_id AND o.customer_id = auth.uid())
);
CREATE POLICY "custody staff read" ON public.chain_of_custody_events FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "custody auth insert" ON public.chain_of_custody_events FOR INSERT WITH CHECK (auth.uid() = actor_id);

-- test results (customer read released only)
CREATE POLICY "results customer read released" ON public.test_results FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.order_samples s JOIN public.orders o ON o.id = s.order_id
    WHERE s.id = test_results.sample_id AND o.customer_id = auth.uid() AND s.stage = 'released'
  )
);
CREATE POLICY "results staff read" ON public.test_results FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "results staff write" ON public.test_results FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- attachments
CREATE POLICY "attachments customer read own" ON public.attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = attachments.order_id AND o.customer_id = auth.uid())
);
CREATE POLICY "attachments staff read" ON public.attachments FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "attachments auth insert" ON public.attachments FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "attachments staff write" ON public.attachments FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- capacity rules
CREATE POLICY "capacity read auth" ON public.capacity_rules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "capacity admin write" ON public.capacity_rules FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- exceptions
CREATE POLICY "exceptions customer read own" ON public.exceptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = exceptions.order_id AND o.customer_id = auth.uid())
);
CREATE POLICY "exceptions staff read" ON public.exceptions FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "exceptions staff insert" ON public.exceptions FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "exceptions admin update" ON public.exceptions FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('evidence','evidence',false),
  ('reports','reports',false),
  ('attachments','attachments',false),
  ('packing-slips','packing-slips',false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: staff manage all; customers read their own attachments scoped by order id prefix
CREATE POLICY "staff read all storage"
ON storage.objects FOR SELECT
USING (bucket_id IN ('evidence','reports','attachments','packing-slips') AND public.is_staff(auth.uid()));

CREATE POLICY "staff write all storage"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id IN ('evidence','reports','attachments','packing-slips') AND public.is_staff(auth.uid()));

CREATE POLICY "staff update all storage"
ON storage.objects FOR UPDATE
USING (bucket_id IN ('evidence','reports','attachments','packing-slips') AND public.is_staff(auth.uid()));

-- Customers can read files whose first path segment is one of their order IDs
CREATE POLICY "customer read own order files"
ON storage.objects FOR SELECT
USING (
  bucket_id IN ('reports','packing-slips','attachments')
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.customer_id = auth.uid()
      AND (storage.foldername(name))[1] = o.id::text
  )
);

CREATE POLICY "customer upload own order files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN ('attachments','packing-slips')
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.customer_id = auth.uid()
      AND (storage.foldername(name))[1] = o.id::text
  )
);

-- ============ SEED DATA ============
INSERT INTO public.products (name, category, description, base_price) VALUES
  ('NPK Fertilizer Analysis','fertilizer','Standard nitrogen-phosphorus-potassium composition test',1500),
  ('Urea Purity Test','fertilizer','Determine urea purity and biuret content',1200),
  ('Raw Phosphate Rock','raw_material','Phosphate concentration & moisture analysis',1800),
  ('Soil Conditioner Mix','fertilizer','pH, EC and organic matter analysis',1400),
  ('Trace Element Profile','raw_material','Micronutrient panel (Zn, Fe, Cu, Mn, B)',2200);
