"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Copy, Check, Calendar, MapPin, User, FlaskConical, Hash, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SplitText } from "@/components/ui/split-text";
import { STAGE_LABEL } from "@/lib/stages";

interface OrderHeroCardProps {
  orderNumber: string;
  orderId: string;
  stage: string;
  createdAt: string;
  deliveryType: string;
  pickupAddress?: string | null;
  deliveryAddress?: string | null;
  total?: number;
  customerName?: string;
  customerCompany?: string | null;
  qrDataUrl?: string;
  sampleCount: number;
  primaryAction?: { label: string; onClick: () => void };
}

export function OrderHeroCard(p: OrderHeroCardProps) {
  const [copiedOrder, setCopiedOrder] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const isReleased = p.stage === "released";
  const isCancelled = p.stage === "cancelled";

  const initials = (p.customerName ?? "C")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function copy(text: string, which: "order" | "id") {
    await navigator.clipboard.writeText(text);
    if (which === "order") {
      setCopiedOrder(true);
      setTimeout(() => setCopiedOrder(false), 1800);
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1800);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-secondary/40 p-6 shadow-[0_16px_50px_-24px_oklch(0.18_0.02_220/0.25)]"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary/15 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <Badge
              variant={isReleased ? "default" : isCancelled ? "destructive" : "secondary"}
              className="mb-1"
            >
              {STAGE_LABEL[p.stage as keyof typeof STAGE_LABEL] ?? p.stage}
            </Badge>
            <p className="text-xs text-muted-foreground">
              <SplitText stagger={0.012}>
                {new Date(p.createdAt).toLocaleString()}
              </SplitText>
            </p>
          </div>
        </div>

        {p.qrDataUrl && (
          <div className="rounded-xl border border-border/60 bg-white p-2 shadow-sm">
            <img src={p.qrDataUrl} alt="Order QR" className="h-20 w-20 rounded-md" />
            <div className="mt-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
              Order QR
            </div>
          </div>
        )}
      </div>

      <div className="relative mt-5 grid gap-4 md:grid-cols-2">
        <Field
          icon={<User className="h-3.5 w-3.5" />}
          label="Customer"
          value={p.customerName ?? "—"}
          sub={p.customerCompany ?? undefined}
        />
        <Field
          icon={<Calendar className="h-3.5 w-3.5" />}
          label="Created"
          value={new Date(p.createdAt).toLocaleDateString()}
        />
        <Field
          icon={<Truck className="h-3.5 w-3.5" />}
          label="Delivery"
          value={p.deliveryType.replace("_", " ")}
        />
        <Field
          icon={<FlaskConical className="h-3.5 w-3.5" />}
          label="Samples"
          value={`${p.sampleCount} sample${p.sampleCount === 1 ? "" : "s"}`}
        />
        {(p.pickupAddress || p.deliveryAddress) && (
          <Field
            icon={<MapPin className="h-3.5 w-3.5" />}
            label={p.pickupAddress ? "Pickup" : "Delivery"}
            value={(p.pickupAddress ?? p.deliveryAddress) as string}
            full
          />
        )}

        <CopyField
          icon={<Hash className="h-3.5 w-3.5" />}
          label="Order Number"
          value={p.orderNumber}
          copied={copiedOrder}
          onCopy={() => copy(p.orderNumber, "order")}
        />
        <CopyField
          icon={<Hash className="h-3.5 w-3.5" />}
          label="Order ID"
          value={p.orderId}
          mono
          copied={copiedId}
          onCopy={() => copy(p.orderId, "id")}
        />
      </div>

      <Separator className="relative my-5" />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        {typeof p.total === "number" && (
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
            <div className="text-2xl font-semibold">RM{p.total.toFixed(2)}</div>
          </div>
        )}
        {p.primaryAction && (
          <Button onClick={p.primaryAction.onClick}>{p.primaryAction.label}</Button>
        )}
      </div>
    </motion.div>
  );
}

function Field({
  icon, label, value, sub, full,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; full?: boolean }) {
  return (
    <div className={`rounded-xl border border-border/60 bg-background/60 p-3 ${full ? "md:col-span-2" : ""}`}>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="font-medium text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function CopyField({
  icon, label, value, copied, onCopy, mono,
}: {
  icon: React.ReactNode; label: string; value: string;
  copied: boolean; onCopy: () => void; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className={`truncate ${mono ? "font-mono text-xs" : "font-medium"} text-foreground`}>
          {value}
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0"
        onClick={onCopy}
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
