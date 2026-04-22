import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SplitText } from "@/components/ui/split-text";
import {
  FlaskConical,
  LogOut,
  LayoutDashboard,
  PlusCircle,
  ListOrdered,
  ScanLine,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

function iconFor(to: string, label: string) {
  const l = label.toLowerCase();
  if (to === "/portal" || to === "/lab" || to === "/admin") return LayoutDashboard;
  if (l.includes("new")) return PlusCircle;
  if (l.includes("queue") || l.includes("order")) return ListOrdered;
  if (l.includes("scan")) return ScanLine;
  if (l.includes("user")) return Users;
  if (l.includes("finance") || l.includes("billing")) return Wallet;
  if (l.includes("config") || l.includes("setting")) return Settings;
  return LayoutDashboard;
}

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
  const location = useLocation();

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
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link
            to="/"
            className="flex items-center gap-2 px-2 py-1.5 font-semibold text-primary hover-scale"
          >
            <FlaskConical className="h-5 w-5 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">
              <SplitText stagger={0.02}>CD Agrovet</SplitText>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((n) => {
                  const Icon = iconFor(n.to, n.label);
                  const active =
                    location.pathname === n.to ||
                    (n.to !== "/portal" &&
                      n.to !== "/lab" &&
                      n.to !== "/admin" &&
                      location.pathname.startsWith(n.to));
                  return (
                    <SidebarMenuItem key={n.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={n.label}>
                        <Link to={n.to as "/portal"}>
                          <Icon className="h-4 w-4" />
                          <span>{n.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={signOut} tooltip="Sign out">
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-card/80 px-4 backdrop-blur-md">
          <SidebarTrigger />
          <span className="text-sm font-medium text-muted-foreground">
            <SplitText stagger={0.015}>{title}</SplitText>
          </span>
        </header>
        <main className="mx-auto w-full max-w-7xl px-6 py-8 animate-fade-in">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
