import { STAGE_LABEL, ORDER_STAGES, stageIndex } from "@/lib/stages";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";

interface StageTimelineProps {
  currentStage: string;
  events?: Array<{
    id: string;
    event_type: string;
    description?: string | null;
    created_at: string;
    metadata?: Record<string, unknown> | null;
  }>;
}

export function StageTimeline({ currentStage, events }: StageTimelineProps) {
  const idx = stageIndex(currentStage);

  // Map each canonical order stage to its most recent matching event (if any)
  const eventByStage = new Map<string, { description?: string | null; created_at: string }>();
  if (events) {
    for (const e of events) {
      // Try to match event_type to a stage key
      if (ORDER_STAGES.includes(e.event_type as (typeof ORDER_STAGES)[number])) {
        eventByStage.set(e.event_type, { description: e.description, created_at: e.created_at });
      }
    }
  }

  const items: TimelineItem[] = ORDER_STAGES.map((s, i) => {
    const status: TimelineItem["status"] =
      i < idx ? "completed" : i === idx ? "active" : "pending";
    const ev = eventByStage.get(s);
    return {
      id: s,
      title: STAGE_LABEL[s] ?? s,
      description: ev?.description ?? undefined,
      timestamp: ev?.created_at,
      status,
    };
  });

  return <Timeline items={items} variant="compact" timestampPosition="inline" />;
}
