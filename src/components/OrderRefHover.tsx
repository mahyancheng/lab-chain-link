import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { STAGE_LABEL } from "@/lib/stages";
import { Package } from "lucide-react";

interface OrderLite {
  id: string;
  order_number: string;
  stage: string;
  total: number | string | null;
  delivery_type: string | null;
  created_at: string;
}

const cache = new Map<string, OrderLite | null>();

/**
 * Inline order reference. Hover for a quick preview, click to jump to the
 * order detail page. Works for both staff (admin/lab) and the owning customer
 * — RLS scopes the read.
 */
export function OrderRefHover({
  orderId,
  to = "/portal/orders/$orderId",
  fallbackLabel,
}: {
  orderId: string;
  /** Defaults to the customer-facing portal route. */
  to?: "/portal/orders/$orderId";
  fallbackLabel?: string;
}) {
  const [order, setOrder] = useState<OrderLite | null | undefined>(
    cache.has(orderId) ? cache.get(orderId) : undefined,
  );

  useEffect(() => {
    if (cache.has(orderId)) return;
    let active = true;
    supabase
      .from("orders")
      .select("id, order_number, stage, total, delivery_type, created_at")
      .eq("id", orderId)
      .maybeSingle()
      .then(({ data }) => {
        cache.set(orderId, (data as OrderLite | null) ?? null);
        if (active) setOrder((data as OrderLite | null) ?? null);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  const label = order?.order_number ?? fallbackLabel ?? "order";

  return (
    <HoverCard openDelay={150} closeDelay={80}>
      <HoverCardTrigger asChild>
        <Link
          to={to}
          params={{ orderId }}
          className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          <Package className="h-3 w-3" />
          {label}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        {order === undefined ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : order === null ? (
          <p className="text-xs text-muted-foreground">Order not found or not visible.</p>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{order.order_number}</span>
              <Badge variant="secondary" className="text-[10px]">
                {STAGE_LABEL[order.stage] ?? order.stage}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-xs text-muted-foreground">
              <span>Created</span>
              <span className="text-right text-foreground">
                {new Date(order.created_at).toLocaleDateString()}
              </span>
              <span>Delivery</span>
              <span className="text-right text-foreground">
                {order.delivery_type ?? "—"}
              </span>
              <span>Total</span>
              <span className="text-right text-foreground">
                RM{Number(order.total ?? 0).toFixed(2)}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Click to open full details</p>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
