import { STAGE_LABEL, ORDER_STAGES, stageIndex } from "@/lib/stages";
import { TrackingTimeline, type TrackingTimelineItem } from "@/components/ui/tracking-timeline";

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

function formatDate(iso?: string) {
  if (!iso) return "Pending";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StageTimeline({ currentStage, events }: StageTimelineProps) {
  const idx = stageIndex(currentStage);

  const eventByStage = new Map<string, { description?: string | null; created_at: string }>();
  if (events) {
    for (const e of events) {
      if (ORDER_STAGES.includes(e.event_type as (typeof ORDER_STAGES)[number])) {
        eventByStage.set(e.event_type, { description: e.description, created_at: e.created_at });
      }
    }
  }

  const items: TrackingTimelineItem[] = ORDER_STAGES.map((s, i) => {
    const status: TrackingTimelineItem["status"] =
      i < idx ? "completed" : i === idx ? "in-progress" : "pending";
    const ev = eventByStage.get(s);
    return {
      id: s,
      title: STAGE_LABEL[s] ?? s,
      date: ev ? formatDate(ev.created_at) : status === "in-progress" ? "In progress" : "Pending",
      status,
    };
  });

  return <TrackingTimeline items={items} />;
}
