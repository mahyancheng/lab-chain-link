import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { SupportChat } from "@/components/SupportChat";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * Dead-simple customer support launcher.
 * Kept intentionally minimal after prior rendering issues:
 * - no portal
 * - no realtime badge logic
 * - fixed button always visible on customer pages
 * - opens the same SupportChat used elsewhere
 */
export function SupportChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close support chat"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[998] bg-background/50 backdrop-blur-sm sm:hidden"
          />
          <div
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
          </div>
        </>
      )}

      <button
        type="button"
        aria-label={open ? "Close support chat" : "Open support chat"}
        onClick={() => setOpen((value) => !value)}
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
