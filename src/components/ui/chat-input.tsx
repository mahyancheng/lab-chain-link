import { createContext, useContext, type ChangeEventHandler, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTextareaResize } from "@/hooks/use-textarea-resize";

interface ChatInputContextValue {
  value?: string;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
  onSubmit?: () => void;
  loading?: boolean;
  variant?: "default" | "unstyled";
  rows?: number;
}
const Ctx = createContext<ChatInputContextValue>({});

interface ChatInputProps extends ChatInputContextValue {
  children: ReactNode;
  className?: string;
}

export function ChatInput({
  children,
  className,
  variant = "default",
  rows = 1,
  ...rest
}: ChatInputProps) {
  return (
    <Ctx.Provider value={{ ...rest, variant, rows }}>
      <div
        className={cn(
          variant === "default" &&
            "flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/30",
          className,
        )}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

interface ChatInputTextAreaProps extends Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange"> {
  value?: string;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
  variant?: "default" | "unstyled";
}

export function ChatInputTextArea({
  value: vProp,
  onChange: cProp,
  variant: variantProp,
  className,
  placeholder = "Type a message…",
  ...props
}: ChatInputTextAreaProps) {
  const ctx = useContext(Ctx);
  const value = vProp ?? ctx.value ?? "";
  const onChange = cProp ?? ctx.onChange;
  const onSubmit = ctx.onSubmit;
  const rows = ctx.rows ?? 1;
  const variant = variantProp ?? (ctx.variant === "default" ? "unstyled" : "default");
  const ref = useTextareaResize(value, rows);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!onSubmit) return;
    if (e.key === "Enter" && !e.shiftKey) {
      if (typeof value !== "string" || value.trim().length === 0) return;
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onKeyDown={handleKey}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        variant === "unstyled" &&
          "min-h-0 resize-none border-0 bg-transparent p-2 shadow-none focus-visible:ring-0",
        className,
      )}
      {...props}
    />
  );
}

export function ChatInputSubmit({ className }: { className?: string }) {
  const ctx = useContext(Ctx);
  const disabled =
    ctx.loading || typeof ctx.value !== "string" || ctx.value.trim().length === 0;
  return (
    <Button
      type="button"
      size="icon"
      className={cn("h-9 w-9 rounded-full", className)}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        if (!disabled) ctx.onSubmit?.();
      }}
    >
      <ArrowUpIcon className="h-4 w-4" />
    </Button>
  );
}
