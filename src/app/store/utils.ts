import type { AppStoreState, RunEventSeverity, RunEventType } from "../types/store";

export function nowIso(): string {
  return new Date().toISOString();
}

export function nextId(state: AppStoreState, prefix: string): string {
  state.meta.idSeq += 1;
  state.meta.lastMutationAt = nowIso();
  return `${prefix}-${String(state.meta.idSeq).padStart(5, "0")}`;
}

export function objectKey(objectType: "job" | "workflow", objectId: string): string {
  return `${objectType}:${objectId}`;
}

export function severityForEventType(eventType: RunEventType): RunEventSeverity {
  if (eventType === "run_completed_failed" || eventType === "connection_offline") {
    return "critical";
  }
  if (
    eventType === "node_completed_failed" ||
    eventType === "trigger_rejected" ||
    eventType === "connection_check_failed"
  ) {
    return "error";
  }
  if (
    eventType === "node_retry_scheduled" ||
    eventType === "node_skipped" ||
    eventType === "node_compensation_success"
  ) {
    return "warning";
  }
  return "info";
}

export function safeJsonParse(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid JSON" };
  }
}

