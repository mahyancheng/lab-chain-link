"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ExternalLink, Calendar, Truck, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STAGE_LABEL } from "@/lib/stages";

export interface OrderRowData {
  id: string;
  order_number: string;
  stage: string;
  total?: number;
  delivery_type: string;
  created_at: string;
  customer?: string | null;
}

export function OrderListRow({ order }: { order: OrderRowData }) {
  const [open, setOpen] = useState(false);

  const stageVariant =
    order.stage === "released" ? "default"
    : order.stage === "cancelled" ? "destructive"
    : "secondary";

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 transition-colors hover:border-accent/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/10"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="truncate font-medium">{order.order_number}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString()} · {order.delivery_type.replace("_", " ")}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {typeof order.total === "number" && (
            <span className="text-sm font-medium tabular-nums">RM{order.total.toFixed(2)}</span>
          )}
          <Badge variant={stageVariant}>{STAGE_LABEL[order.stage] ?? order.stage}</Badge>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-muted-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="expand"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border/60 bg-background/40"
          >
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <Mini icon={<Hash className="h-3.5 w-3.5" />} label="Order #" value={order.order_number} />
              <Mini icon={<Truck className="h-3.5 w-3.5" />} label="Delivery" value={order.delivery_type.replace("_", " ")} />
              <Mini icon={<Calendar className="h-3.5 w-3.5" />} label="Created" value={new Date(order.created_at).toLocaleDateString()} />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border/60 p-3">
              <Link to="/portal/orders/$orderId" params={{ orderId: order.id }}>
                <Button size="sm">
                  View full order
                  <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Mini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="truncate text-sm font-medium">{value}</div>
    </div>
  );
}
