-- SECURITY DEFINER fn so staff (lab + admin) can list customer user_ids
-- without needing a permissive SELECT policy on user_roles.
CREATE OR REPLACE FUNCTION public.list_customer_ids()
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role = 'customer'
    AND public.is_staff(auth.uid())
$$;

REVOKE ALL ON FUNCTION public.list_customer_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_customer_ids() TO authenticated;