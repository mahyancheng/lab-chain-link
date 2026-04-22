-- 1) Collapse to a single role per user (admin > lab > customer)
WITH ranked AS (
  SELECT
    id,
    user_id,
    role,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY CASE role::text
        WHEN 'admin' THEN 1
        WHEN 'lab' THEN 2
        WHEN 'customer' THEN 3
        ELSE 4
      END
    ) AS rn
  FROM public.user_roles
)
DELETE FROM public.user_roles ur
USING ranked r
WHERE ur.id = r.id
  AND r.rn > 1;

-- 2) Enforce one role per user from now on
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_unique;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- 3) Belt-and-suspenders: trigger blocks any future attempt to give a
--    user a second role, even if the constraint is dropped.
CREATE OR REPLACE FUNCTION public.enforce_single_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'User % already has a role assigned. Each user may only have one role.', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_role_trg ON public.user_roles;
CREATE TRIGGER enforce_single_role_trg
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_role();