import { createFileRoute } from "@tanstack/react-router";
import { PortalShell } from "@/components/PortalShell";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/hooks/useAuth";
import { SupportChat } from "@/components/SupportChat";
import { SplitText } from "@/components/ui/split-text";
import { MessageSquare } from "lucide-react";

const NAV = [
  { to: "/portal", label: "My orders" },
  { to: "/portal/new", label: "New order" },
  { to: "/portal/support", label: "Support" },
];

export const Route = createFileRoute("/portal/support")({
  component: () => (
    <RoleGuard allow={["customer"]}>
      <CustomerSupport />
    </RoleGuard>
  ),
});

function CustomerSupport() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <PortalShell title="Customer Portal" nav={NAV} requireRole="customer">
      <div className="mb-6 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">
          <SplitText>Support</SplitText>
        </h1>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Chat directly with our lab and admin team. Reference any of your orders
        from the picker — staff can hover the link to see order details.
      </p>
      <div className="max-w-3xl">
        <SupportChat customerId={user.id} />
      </div>
    </PortalShell>
  );
}
