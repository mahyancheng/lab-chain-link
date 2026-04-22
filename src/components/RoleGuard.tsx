import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, homeRouteFor } from "@/hooks/useAuth";

type Role = "customer" | "lab" | "admin";

interface Props {
  allow: Role[];
  children: ReactNode;
}

/**
 * Gate a route by role. While auth/roles are loading, render nothing.
 * If unauthenticated → /auth. If authenticated but wrong role → user's home.
 */
export function RoleGuard({ allow, children }: Props) {
  const { user, roles, rolesLoaded, loading } = useAuth();
  const nav = useNavigate();

  const allowed = user && rolesLoaded && roles.some((r) => allow.includes(r));

  useEffect(() => {
    if (loading || !rolesLoaded) return;
    if (!user) {
      nav({ to: "/auth" });
      return;
    }
    if (!roles.some((r) => allow.includes(r))) {
      nav({ to: homeRouteFor(roles) as "/portal" });
    }
  }, [user, roles, rolesLoaded, loading, allow, nav]);

  if (loading || !rolesLoaded || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!allowed) return null;
  return <>{children}</>;
}
