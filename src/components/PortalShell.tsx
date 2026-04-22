import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { FlaskConical, LogOut } from "lucide-react";

export function PortalShell({
  title,
  nav,
  children,
  requireRole,
}: {
  title: string;
  nav: { to: string; label: string }[];
  children: ReactNode;
  requireRole?: "customer" | "lab" | "admin";
}) {
  const { user, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (requireRole && !roles.includes(requireRole)) {
      navigate({ to: "/" });
    }
  }, [user, roles, loading, requireRole, navigate]);

  if (loading || !user) {
    return <div className="p-10 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-primary">
            <FlaskConical className="h-5 w-5" />
            CD Agrovet
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to as "/portal"}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{title}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
