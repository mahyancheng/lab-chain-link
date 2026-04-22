import { createFileRoute } from "@tanstack/react-router";
import { PortalShell } from "@/components/PortalShell";
import { RoleGuard } from "@/components/RoleGuard";
import { SplitText } from "@/components/ui/split-text";
import { Card } from "@/components/ui/card";
import { MessageSquare, Mail, Clock, ShieldCheck } from "lucide-react";

const NAV = [
  { to: "/portal", label: "My orders" },
  { to: "/portal/new", label: "New order" },
];

export const Route = createFileRoute("/portal/support")({
  component: () => (
    <RoleGuard allow={["customer"]}>
      <CustomerSupport />
    </RoleGuard>
  ),
});

function CustomerSupport() {
  return (
    <PortalShell title="Customer Portal" nav={NAV} requireRole="customer">
      <div className="mb-6 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">
          <SplitText>Support</SplitText>
        </h1>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Need a hand? Use the floating chat bubble at the bottom-right to message our lab and
        admin team. You can reference any of your orders directly inside the conversation.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <Clock className="mb-2 h-5 w-5 text-primary" />
          <h3 className="font-semibold">Fast replies</h3>
          <p className="mt-1 text-sm text-muted-foreground">Typically within 1 business day.</p>
        </Card>
        <Card className="p-4">
          <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
          <h3 className="font-semibold">Order context</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Reference any of your orders to keep the conversation focused.
          </p>
        </Card>
        <Card className="p-4">
          <Mail className="mb-2 h-5 w-5 text-primary" />
          <h3 className="font-semibold">Always available</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The chat bubble follows you across every page.
          </p>
        </Card>
      </div>
    </PortalShell>
  );
}
