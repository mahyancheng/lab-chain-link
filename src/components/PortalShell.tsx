import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SplitText } from "@/components/ui/split-text";
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
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-primary hover-scale">
            <FlaskConical className="h-5 w-5" />
            <SplitText stagger={0.02}>CD Agrovet</SplitText>
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to as "/portal"}
                className="pill-nav"
                activeProps={{ className: "pill-nav-active" }}
              >
                <SplitText stagger={0.015}>{n.label}</SplitText>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground"><SplitText stagger={0.015}>{title}</SplitText></span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8 animate-fade-in">{children}</main>
    </div>
  );
}
