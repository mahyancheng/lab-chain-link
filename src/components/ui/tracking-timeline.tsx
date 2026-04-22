"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Check, Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrackingTimelineItem {
  id: string | number;
  title: string;
  date: string;
  status: "completed" | "in-progress" | "pending";
  icon?: React.ReactNode;
}

interface TrackingTimelineProps {
  items: TrackingTimelineItem[];
  className?: string;
}

function StatusIcon({
  status,
  customIcon,
}: {
  status: TrackingTimelineItem["status"];
  customIcon?: React.ReactNode;
}) {
  if (customIcon) return <>{customIcon}</>;
  switch (status) {
    case "completed":
      return <Check className="h-4 w-4 text-primary-foreground" />;
    case "in-progress":
      return <CircleDot className="h-4 w-4 text-primary-foreground" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export function TrackingTimeline({ items, className }: TrackingTimelineProps) {
  return (
    <motion.ol
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("relative space-y-6", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isCompleted = item.status === "completed";
        const isActive = item.status === "in-progress";

        return (
          <motion.li
            key={item.id}
            variants={itemVariants}
            className="relative flex items-start gap-4"
          >
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-5 top-10 h-[calc(100%+0.5rem)] w-px",
                  isCompleted ? "bg-primary" : "bg-border",
                )}
              />
            )}

            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
              {isActive && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-primary/30"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <div
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  !isCompleted && !isActive && "border-border bg-background text-muted-foreground",
                )}
              >
                <StatusIcon status={item.status} customIcon={item.icon} />
              </div>
            </div>

            <div className="flex flex-1 flex-col pt-1.5">
              <span
                className={cn(
                  "text-sm font-medium leading-tight",
                  item.status === "pending" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {item.title}
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">{item.date}</span>
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}

export default TrackingTimeline;
