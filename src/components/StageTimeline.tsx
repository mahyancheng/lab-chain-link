import { STAGE_LABEL, ORDER_STAGES, stageIndex } from "@/lib/stages";
import { Check } from "lucide-react";

export function StageTimeline({ currentStage }: { currentStage: string }) {
  const idx = stageIndex(currentStage);
  return (
    <ol className="space-y-3">
      {ORDER_STAGES.map((s, i) => {
        const done = i <= idx;
        const isCurrent = i === idx;
        return (
          <li key={s} className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                done
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`text-sm ${isCurrent ? "font-semibold" : done ? "" : "text-muted-foreground"}`}>
              {STAGE_LABEL[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
