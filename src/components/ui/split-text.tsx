"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

interface SplitTextProps {
  children: ReactNode;
  className?: string;
  /** Delay between words (s). Default 0.04 */
  stagger?: number;
  /** Initial delay before first word (s). Default 0 */
  delay?: number;
  /** Render as block-level element. Default inline-flex wrap */
  as?: "span" | "div" | "h1" | "h2" | "h3" | "h4" | "p";
}

/**
 * Animated text reveal — splits children string into words and fades+slides
 * each word in. Re-runs when the `children` text changes (keyed on text).
 * Falls back to plain rendering for non-string children.
 */
export function SplitText({
  children,
  className = "",
  stagger = 0.04,
  delay = 0,
  as = "span",
}: SplitTextProps) {
  const Comp = motion[as] as typeof motion.span;
  const text = typeof children === "string" ? children : "";

  if (!text) {
    return <span className={className}>{children}</span>;
  }

  const words = text.split(/(\s+)/); // keep whitespace tokens

  return (
    <Comp key={text} className={className} aria-label={text}>
      {words.map((w, i) => {
        if (/^\s+$/.test(w)) return <span key={i}>{w}</span>;
        return (
          <motion.span
            key={`${i}-${w}`}
            aria-hidden
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1],
              delay: delay + i * stagger,
            }}
            style={{ display: "inline-block", willChange: "transform, opacity, filter" }}
          >
            {w}
          </motion.span>
        );
      })}
    </Comp>
  );
}
