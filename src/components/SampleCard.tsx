"use client";

import type React from "react";
import { useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABEL } from "@/lib/stages";
import { ChevronDown, FlaskConical, QrCode } from "lucide-react";

interface SampleCardProps {
  label: string;
  stage: string;
  productName?: string;
  itemCode?: string | null;
  category?: string | null;
  batchNo?: string | null;
  origin?: string | null;
  composition?: string | null;
  packagingInstructions?: string | null;
  tatDays?: number | null;
  qrDataUrl?: string;
  sampleId: string;
  intake?: { disposition?: string; weightG?: number | null; condition?: string | null; notes?: string | null } | null;
}

export function SampleCard(props: SampleCardProps) {
  const {
    label, stage, productName, itemCode, category,
    batchNo, origin, composition, packagingInstructions, tatDays,
    qrDataUrl, sampleId, intake,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-60, 60], [6, -6]);
  const rotateY = useTransform(mouseX, [-60, 60], [-6, 6]);
  const sRX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const sRY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  function handleMouseMove(e: React.MouseEvent) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mouseX.set(e.clientX - (rect.left + rect.width / 2));
    mouseY.set(e.clientY - (rect.top + rect.height / 2));
  }
  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => setExpanded((v) => !v)}
      style={{ rotateX: sRX, rotateY: sRY, transformPerspective: 1000 }}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-secondary/30 shadow-[0_4px_24px_-12px_oklch(0.18_0.02_220/0.18)] transition-shadow duration-300 hover:shadow-[0_18px_40px_-18px_oklch(0.62_0.16_150/0.35)]"
      whileTap={{ scale: 0.985 }}
      layout
    >
      {/* Sheen */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_var(--x,50%)_var(--y,30%),oklch(0.78_0.12_230/0.18),transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex gap-4 p-5">
        {/* QR */}
        <motion.div layout className="shrink-0">
          <div className="relative rounded-xl border border-border/60 bg-white p-2 shadow-sm">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR for ${label}`}
                className="h-32 w-32 rounded-md"
              />
            ) : (
              <div className="h-32 w-32 animate-pulse rounded-md bg-muted" />
            )}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground shadow-sm">
              <QrCode className="mr-1 inline h-3 w-3" />
              Scan
            </div>
          </div>
        </motion.div>

        {/* Body */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                <h3 className="truncate font-semibold tracking-tight">{label}</h3>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {productName}
                {itemCode ? ` · ${itemCode}` : ""}
                {category ? ` · ${category}` : ""}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">
              {STAGE_LABEL[stage as keyof typeof STAGE_LABEL] ?? stage}
            </Badge>
          </div>

          {(batchNo || origin || composition) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {batchNo && <Chip label="Batch" value={batchNo} />}
              {origin && <Chip label="Origin" value={origin} />}
              {composition && <Chip label="Composition" value={composition} />}
            </div>
          )}

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="expand"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-xl bg-secondary/40 p-3 text-xs">
                  <div className="mb-1 font-medium uppercase tracking-wide text-muted-foreground">
                    Packaging instructions
                  </div>
                  <p className="text-foreground/80">
                    {packagingInstructions ??
                      "Pack in clean, sealed container with tamper-evident seal. Label with sample QR."}
                  </p>
                  {tatDays && (
                    <p className="mt-1 text-muted-foreground">Expected TAT: {tatDays} days</p>
                  )}
                </div>
                {intake?.disposition && (
                  <div className="mt-2 rounded-xl border border-border/60 bg-card p-3 text-xs">
                    <span className="font-semibold">Intake:</span> {intake.disposition}
                    {intake.weightG != null && <> · {intake.weightG}g</>}
                    {intake.condition && <> · {intake.condition}</>}
                    {intake.notes && <> — {intake.notes}</>}
                  </div>
                )}
                <div className="mt-2 font-mono text-[10px] text-muted-foreground break-all">
                  Sample ID: {sampleId}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-3 w-3" />
            </motion.span>
            {expanded ? "Hide details" : "Tap card for details"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[11px]">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}
