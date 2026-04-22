import { useCallback, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { MessageSquare, X } from "lucide-react";
import { SupportChat } from "@/components/SupportChat";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const containerVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transformOrigin: "bottom right",
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

export function SupportChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const toggleOpen = useCallback(() => setOpen((v) => !v), []);

  if (!user) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close support chat"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[998] bg-background/50 backdrop-blur-sm sm:hidden"
            />
            <motion.div
              key="support-panel"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                "fixed z-[999] overflow-hidden rounded-xl border border-border bg-card shadow-2xl",
                "inset-x-3 bottom-24 top-16",
                "sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[620px] sm:w-[380px]",
              )}
            >
              <div className="relative h-full w-full">
                <SupportChat customerId={user.id} className="h-full border-0 shadow-none" />
                <button
                  type="button"
                  aria-label="Close support chat"
                  onClick={() => setOpen(false)}
                  className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <button
        type="button"
        aria-label={open ? "Close support chat" : "Open support chat"}
        onClick={toggleOpen}
        className={cn(
          "fixed bottom-6 right-6 z-[999] inline-flex items-center gap-2 rounded-full px-4 py-3",
          "bg-primary text-primary-foreground shadow-xl ring-1 ring-primary/20",
          "transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]",
        )}
      >
        {open ? <X className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
        <span className="text-sm font-medium">Support</span>
      </button>
    </>
  );
}
