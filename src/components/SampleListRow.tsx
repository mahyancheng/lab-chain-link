"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ExternalLink, Hash, FlaskConical, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STAGE_LABEL } from "@/lib/stages";

export interface SampleRowData {
  id: string;
  sample_label: string;
  stage: string;
  qr_code: string;
  order_id: string;
  order_number?: string | null;
  product_name?: string | null;
  batch_no?: string | null;
  created_at: string;
}

export function SampleListRow({ sample }: { sample: SampleRowData }) {
  const [open, setOpen] = useState(false);

  const stageVariant =
    sample.stage === "released" ? "default"
    : sample.stage === "rejected" ? "destructive"
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
          <div className="truncate font-medium">{sample.sample_label}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            Order {sample.order_number ?? sample.order_id.slice(0, 8)} · QR {sample.qr_code.slice(0, 10)}…
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={stageVariant}>{STAGE_LABEL[sample.stage] ?? sample.stage}</Badge>
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
              <Mini icon={<Hash className="h-3.5 w-3.5" />} label="QR" value={sample.qr_code} />
              <Mini icon={<FlaskConical className="h-3.5 w-3.5" />} label="Product" value={sample.product_name ?? "—"} />
              <Mini icon={<Package className="h-3.5 w-3.5" />} label="Batch" value={sample.batch_no ?? "—"} />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border/60 p-3">
              <Link to="/lab/samples/$sampleId" params={{ sampleId: sample.id }}>
                <Button size="sm">
                  Open sample
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
