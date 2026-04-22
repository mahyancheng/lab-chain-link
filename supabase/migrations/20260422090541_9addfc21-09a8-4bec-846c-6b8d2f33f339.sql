
-- 1) app_settings (singleton row)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true,
  qa_required_approvals smallint NOT NULL DEFAULT 2 CHECK (qa_required_approvals IN (1,2)),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = true)
);

INSERT INTO public.app_settings (id, qa_required_approvals)
VALUES (true, 2)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings read auth"
  ON public.app_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "settings admin write"
  ON public.app_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_app_settings_updated
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) sample_approvals
CREATE TABLE IF NOT EXISTS public.sample_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL REFERENCES public.order_samples(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sample_id, approver_id)
);

CREATE INDEX IF NOT EXISTS idx_sample_approvals_sample ON public.sample_approvals(sample_id);

ALTER TABLE public.sample_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals staff read"
  ON public.sample_approvals FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "approvals lab insert"
  ON public.sample_approvals FOR INSERT
  WITH CHECK (
    public.is_staff(auth.uid())
    AND approver_id = auth.uid()
  );

CREATE POLICY "approvals admin delete"
  ON public.sample_approvals FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) Auto-advance sample stage when required approvals reached
CREATE OR REPLACE FUNCTION public.maybe_advance_sample_after_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  required smallint;
  current_count int;
  current_stage sample_stage;
BEGIN
  SELECT qa_required_approvals INTO required FROM public.app_settings WHERE id = true;
  IF required IS NULL THEN required := 2; END IF;

  SELECT stage INTO current_stage FROM public.order_samples WHERE id = NEW.sample_id;
  IF current_stage <> 'qa_review' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(DISTINCT approver_id) INTO current_count
  FROM public.sample_approvals WHERE sample_id = NEW.sample_id;

  IF current_count >= required THEN
    UPDATE public.order_samples
       SET stage = 'ready_for_release',
           qa_verified_by = NEW.approver_id,
           qa_verified_at = now(),
           updated_at = now()
     WHERE id = NEW.sample_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sample_approval_advance ON public.sample_approvals;
CREATE TRIGGER trg_sample_approval_advance
  AFTER INSERT ON public.sample_approvals
  FOR EACH ROW EXECUTE FUNCTION public.maybe_advance_sample_after_approval();
