import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { MessageSquare, X, Sparkles } from "lucide-react";
import { SupportChat } from "@/components/SupportChat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95, transformOrigin: "bottom right" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", damping: 25, stiffness: 300 },
  },
  exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.18 } },
};

/**
 * Floating customer support chat. Reuses <SupportChat /> so the panel UI &
 * behaviour matches the admin view. The internal/public toggle is hidden for
 * customers (SupportChat already enforces this via role checks).
 *
 * Rendered in a portal on document.body with the highest practical z-index so
 * no parent transform/overflow can clip it.
 */
export function SupportChatWidget() {
  const { user, roles } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [mounted, setMounted] = useState(false);

  const isStaff = roles.includes("admin") || roles.includes("lab");

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => setMounted(true), []);

  // Realtime unread badge while closed.
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

  if (!mounted || !user || isStaff) return null;

  const node = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 2147483000,
      }}
    >
      <AnimatePresence>
        {open && (
          <>
            {/* Mobile backdrop */}
            <motion.button
              key="backdrop"
              type="button"
              aria-label="Close support chat"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/60 backdrop-blur-sm sm:hidden"
              style={{ pointerEvents: "auto" }}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                "absolute overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/10",
                // Mobile: near full-screen sheet
                "inset-x-2 bottom-24 top-16",
                // Desktop: compact card bottom-right
                "sm:inset-auto sm:bottom-24 sm:right-4 sm:h-[600px] sm:w-[380px]",
              )}
              style={{ pointerEvents: "auto" }}
            >
              <SupportChat
                customerId={user.id}
                className="h-full border-0 shadow-none"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Trigger bubble */}
      <motion.button
        type="button"
        onClick={toggle}
        aria-label={open ? "Close support chat" : "Open support chat"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "absolute bottom-4 right-4 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
          "shadow-lg shadow-primary/30 ring-1 ring-primary/20",
        )}
        style={{ pointerEvents: "auto" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span
              key="msg"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <MessageSquare className="h-6 w-6" />
              <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-primary-foreground/80" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </motion.button>
    </div>
  );

  return createPortal(node, document.body);
}
