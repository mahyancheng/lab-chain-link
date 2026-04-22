import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChatInput, ChatInputSubmit, ChatInputTextArea } from "@/components/ui/chat-input";
import { OrderRefHover } from "@/components/OrderRefHover";
import { Hash, Lock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Role = "customer" | "lab" | "admin";

interface Msg {
  id: string;
  customer_id: string;
  author_id: string;
  author_role: Role;
  body: string;
  order_ref: string | null;
  internal: boolean;
  created_at: string;
}

interface OrderLite {
  id: string;
  order_number: string;
}

/**
 * Parse a message body and replace [[order:UUID]] tokens with hover-cards.
 */
function renderBody(body: string, customerOrderRoute: boolean) {
  const parts: (string | { id: string })[] = [];
  const re = /\[\[order:([0-9a-f-]{36})\]\]/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) parts.push(body.slice(last, m.index));
    parts.push({ id: m[1] });
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push(body.slice(last));
  return parts.map((p, i) =>
    typeof p === "string" ? (
      <span key={i}>{p}</span>
    ) : (
      <OrderRefHover
        key={i}
        orderId={p.id}
        to={customerOrderRoute ? "/portal/orders/$orderId" : "/portal/orders/$orderId"}
      />
    ),
  );
}

export function SupportChat({
  customerId,
  customerName,
  className,
}: {
  customerId: string;
  customerName?: string;
  className?: string;
}) {
  const { user, roles } = useAuth();
  const isStaff = roles.includes("admin") || roles.includes("lab");
  const myRole: Role = roles.includes("admin")
    ? "admin"
    : roles.includes("lab")
      ? "lab"
      : "customer";

  const [messages, setMessages] = useState<Msg[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [draft, setDraft] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Load history + customer's orders for the ref picker
  useEffect(() => {
    let active = true;
    (async () => {
      const [msgRes, orderRes] = await Promise.all([
        supabase
          .from("customer_messages")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: true })
          .limit(500),
        supabase
          .from("orders")
          .select("id, order_number")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (!active) return;
      setMessages((msgRes.data ?? []) as Msg[]);
      setOrders((orderRes.data ?? []) as OrderLite[]);
    })();
    return () => {
      active = false;
    };
  }, [customerId]);

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel(`cm-${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "customer_messages",
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [customerId]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const visible = useMemo(
    () => (isStaff ? messages : messages.filter((m) => !m.internal)),
    [messages, isStaff],
  );

  async function send() {
    if (!user) return;
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    const { error } = await supabase.from("customer_messages").insert({
      customer_id: customerId,
      author_id: user.id,
      author_role: myRole,
      body,
      internal: isStaff ? internal : false,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft("");
  }

  function insertOrderRef(id: string) {
    setDraft((d) => (d.endsWith(" ") || d.length === 0 ? d : d + " ") + `[[order:${id}]] `);
  }

  return (
    <Card className={cn("flex h-[600px] flex-col overflow-hidden", className)}>
      <header className="flex items-center justify-between border-b bg-card/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">
            {isStaff ? `Conversation · ${customerName ?? "Customer"}` : "Support"}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {isStaff ? "Visible to customer unless marked internal" : "Replies typically within 1 business day"}
        </span>
      </header>

      <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet. Say hello 👋
          </p>
        ) : (
          visible.map((m) => {
            const mine = m.author_id === user?.id;
            return (
              <div
                key={m.id}
                className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}
              >
                <div className="flex items-center gap-2 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span>{m.author_role}</span>
                  {m.internal && (
                    <Badge variant="outline" className="h-4 gap-1 px-1 py-0 text-[9px]">
                      <Lock className="h-2.5 w-2.5" />
                      internal
                    </Badge>
                  )}
                  <span>· {new Date(m.created_at).toLocaleString()}</span>
                </div>
                <div
                  className={cn(
                    "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                    m.internal
                      ? "border border-amber-300/40 bg-amber-100/30 text-foreground"
                      : mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                  )}
                >
                  {renderBody(m.body, !isStaff)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t bg-card/60 px-3 py-3">
        <div className="mb-2 flex items-center gap-2">
          {orders.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs">
                  <Hash className="h-3 w-3" />
                  Reference order
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-1">
                <div className="max-h-64 space-y-0.5 overflow-y-auto">
                  {orders.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => insertOrderRef(o.id)}
                      className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                    >
                      {o.order_number}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {isStaff && (
            <div className="ml-auto flex items-center gap-2">
              <Switch id="internal-toggle" checked={internal} onCheckedChange={setInternal} />
              <Label htmlFor="internal-toggle" className="cursor-pointer text-xs text-muted-foreground">
                Internal note (staff only)
              </Label>
            </div>
          )}
        </div>
        <ChatInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onSubmit={send}
          loading={sending}
          rows={1}
        >
          <ChatInputTextArea placeholder="Type a message… (Enter to send, Shift+Enter for newline)" />
          <ChatInputSubmit />
        </ChatInput>
      </div>
    </Card>
  );
}
