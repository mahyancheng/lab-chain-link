export const ORDER_STAGES = [
  "draft",
  "ordered",
  "paid",
  "picked_up",
  "in_transit",
  "received_at_lab",
  "sample_verified",
  "in_testing",
  "qa_review",
  "ready_for_release",
  "released",
] as const;

export const STAGE_LABEL: Record<string, string> = {
  draft: "Draft",
  ordered: "Ordered",
  paid: "Paid",
  picked_up: "Picked up",
  in_transit: "In transit",
  received_at_lab: "Received at lab",
  sample_verified: "Sample verified",
  in_testing: "In testing",
  qa_review: "QA review",
  ready_for_release: "Ready for release",
  released: "Released",
  cancelled: "Cancelled",
  pending: "Pending",
  received: "Received",
  sample_prep: "Sample preparation",
  data_validation: "Data validation",
  rejected: "Rejected",
};

// Customer-facing milestone view (Step 4 in spec)
export const CUSTOMER_MILESTONES = [
  "ordered",
  "in_transit",
  "received_at_lab",
  "in_testing",
  "qa_review",
  "released",
] as const;

export const SAMPLE_STAGE_FLOW: { stage: string; next: string | null; orderStage: string | null }[] = [
  { stage: "pending", next: "received", orderStage: null },
  { stage: "received", next: "sample_prep", orderStage: "received_at_lab" },
  { stage: "sample_prep", next: "in_testing", orderStage: "sample_verified" },
  { stage: "in_testing", next: "data_validation", orderStage: "in_testing" },
  { stage: "data_validation", next: "qa_review", orderStage: "in_testing" },
  { stage: "qa_review", next: "ready_for_release", orderStage: "qa_review" },
  { stage: "ready_for_release", next: "released", orderStage: "ready_for_release" },
  { stage: "released", next: null, orderStage: "released" },
];

export function nextSampleStage(stage: string): string | null {
  return SAMPLE_STAGE_FLOW.find((s) => s.stage === stage)?.next ?? null;
}

export function orderStageForSample(stage: string): string | null {
  return SAMPLE_STAGE_FLOW.find((s) => s.stage === stage)?.orderStage ?? null;
}

export function stageIndex(stage: string) {
  const i = ORDER_STAGES.indexOf(stage as (typeof ORDER_STAGES)[number]);
  return i === -1 ? 0 : i;
}
