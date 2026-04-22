import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Role = "customer" | "lab" | "admin";

async function fetchSessionRoles(): Promise<{ userId: string | null; roles: Role[] }> {
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user?.id ?? null;
  if (!userId) return { userId: null, roles: [] };
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return { userId, roles: (data ?? []).map((r) => r.role as Role) };
}

function homeFor(roles: Role[]): "/admin" | "/lab" | "/portal" {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("lab")) return "/lab";
  return "/portal";
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { userId, roles } = await fetchSessionRoles();
    if (!userId) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { userId, roles, homeFor };
  },
  component: () => <Outlet />,
});
