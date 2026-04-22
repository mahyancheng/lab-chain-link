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
  released: "Released",
  cancelled: "Cancelled",
  pending: "Pending",
  ready_for_release: "Ready for release",
  rejected: "Rejected",
};

export function stageIndex(stage: string) {
  const i = ORDER_STAGES.indexOf(stage as (typeof ORDER_STAGES)[number]);
  return i === -1 ? 0 : i;
}
