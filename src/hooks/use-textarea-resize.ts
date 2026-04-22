import { useLayoutEffect, useRef, type ComponentProps } from "react";

export function useTextareaResize(
  value: ComponentProps<"textarea">["value"],
  rows = 1,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textArea = textareaRef.current;
    if (!textArea) return;
    const cs = window.getComputedStyle(textArea);
    const lineHeight = Number.parseInt(cs.lineHeight, 10) || 20;
    const padding =
      Number.parseInt(cs.paddingTop, 10) + Number.parseInt(cs.paddingBottom, 10);
    const minHeight = lineHeight * rows + padding;
    textArea.style.height = "0px";
    const scrollHeight = Math.max(textArea.scrollHeight, minHeight);
    textArea.style.height = `${scrollHeight + 2}px`;
  }, [value, rows]);

  return textareaRef;
}
