export const PIPELINE = ["NEW", "PACKING", "DISPATCHED", "DELIVERED", "EVENT_COMPLETED"] as const;
export type PipelineStatus = (typeof PIPELINE)[number];
export type AnyStatus = PipelineStatus | "PENDING_PAYMENT" | "CANCELLED";

export const STATUS_LABEL: Record<AnyStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  NEW: "Confirmed",
  PACKING: "Packing",
  DISPATCHED: "Out for delivery",
  DELIVERED: "Delivered",
  EVENT_COMPLETED: "Party done",
  CANCELLED: "Cancelled",
};

/** Allowed manual moves in the ops portal. Payment-driven moves happen in the engine. */
export const TRANSITIONS: Record<AnyStatus, AnyStatus[]> = {
  PENDING_PAYMENT: ["NEW", "CANCELLED"],
  NEW: ["PACKING", "CANCELLED"],
  PACKING: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: ["EVENT_COMPLETED"],
  EVENT_COMPLETED: [],
  CANCELLED: [],
};
