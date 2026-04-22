import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, X } from "lucide-react";
import { SupportChat } from "@/components/SupportChat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * Floating customer support chat rendered on document.body so no parent layout
 * can clip or hide it.
 */
export function SupportChatWidget() {
  const { user, roles } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [mounted, setMounted] = useState(false);

  const isStaff = roles.includes("admin") || roles.includes("lab");

  useEffect(() => {
    setMounted(true);
  }, []);

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
          if (m.internal || m.author_id === user.id) return;
          if (!open) setUnread((count) => count + 1);
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

  if (!mounted || !user || isStaff) return null;

  return createPortal(
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 2147483000,
      }}
    >
      {open && (
        <>
          <button
            type="button"
            aria-label="Close support chat"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-background/50 backdrop-blur-sm sm:hidden"
            style={{ pointerEvents: "auto" }}
          />

          <div
            className={cn(
              "absolute overflow-hidden rounded-xl border border-border bg-card shadow-2xl",
              "inset-x-2 bottom-24 top-16",
              "sm:inset-auto sm:bottom-24 sm:right-4 sm:h-[600px] sm:w-[380px]",
            )}
            style={{ pointerEvents: "auto" }}
          >
            <SupportChat customerId={user.id} className="h-full border-0 shadow-none" />
          </div>
        </>
      )}

      <button
        type="button"
        aria-label={open ? "Close support chat" : "Open support chat"}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "absolute bottom-4 right-4 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-lg ring-1 ring-primary/20",
          "transition-transform duration-200 hover:scale-105 active:scale-95",
        )}
        style={{ pointerEvents: "auto" }}
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>,
    document.body,
  );
}
