import { useEffect, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupportChat } from "@/components/SupportChat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * Floating chat widget for the customer portal. Bottom-right bubble; expands
 * into a chat panel that adapts from a full-screen sheet on phones to a
 * fixed-size card on desktop.
 */
export function SupportChatWidget() {
  const { user, roles } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // Hide for staff — they have their own per-customer chat in the admin view.
  const isStaff = roles.includes("admin") || roles.includes("lab");

  // Realtime unread badge: count messages from staff while widget is closed.
  useEffect(() => {
    if (!user || isStaff) return;
    const ch = supabase
      .channel(`cm-widget-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "customer_messages",
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          const m = payload.new as { author_id: string; internal: boolean };
          if (m.internal) return;
          if (m.author_id === user.id) return;
          if (!open) setUnread((n) => n + 1);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user, isStaff, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  if (!user || isStaff) return null;

  return (
    <>
      {/* Backdrop on small screens when open */}
      {open && (
        <button
          aria-label="Close support chat"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm sm:hidden"
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-200 ease-out",
          open
            ? "pointer-events-auto opacity-100 translate-y-0"
            : "pointer-events-none opacity-0 translate-y-4",
          // Mobile: full-screen-ish sheet from bottom
          "inset-x-2 bottom-2 top-16",
          // Desktop: anchored card bottom-right
          "sm:inset-auto sm:bottom-20 sm:right-4 sm:top-auto sm:h-[600px] sm:w-[380px]",
        )}
      >
        <div className="relative h-full w-full">
          <SupportChat customerId={user.id} className="h-full shadow-2xl" />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="absolute right-2 top-2 h-7 w-7 rounded-full"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Trigger bubble */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open support chat"
        className={cn(
          "fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
          "transition-transform hover:scale-105 active:scale-95",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </>
  );
}
