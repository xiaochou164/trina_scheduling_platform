import type {
  Alert,
  AppStoreState,
  Job,
  Run,
  RunEvent,
  RuntimeDefaults,
  Workflow,
  WorkflowVersion,
} from "../types/store";

type TimeRangeInput = { from?: string; to?: string };

function inRange(iso: string | undefined, range?: TimeRangeInput): boolean {
  if (!iso) return false;
  if (!range?.from && !range?.to) return true;
  const time = new Date(iso).getTime();
  if (range.from && time < new Date(range.from).getTime()) return false;
  if (range.to && time > new Date(range.to).getTime()) return false;
  return true;
}

export function selectRuntimeDefaults(state: AppStoreState): RuntimeDefaults {
  return state.settings.runtimeDefaults;
}

export function selectRunById(state: AppStoreState, runId: string): Run | undefined {
  return state.entities.runs.byId[runId];
}

export function selectRunEvents(state: AppStoreState, runId: string): RunEvent[] {
  const ids = state.indexes.eventIdsByRunId[runId] ?? [];
  return ids
    .map((id) => state.entities.runEvents.byId[id])
    .filter(Boolean)
    .sort((a, b) => a.sequence - b.sequence || a.time.localeCompare(b.time));
}

export function selectRunAlerts(state: AppStoreState, runId: string): Alert[] {
  const ids = state.indexes.alertIdsByRunId[runId] ?? [];
  return ids.map((id) => state.entities.alerts.byId[id]).filter(Boolean);
}

export function selectDashboardKpis(state: AppStoreState, range?: TimeRangeInput) {
  const runs = state.entities.runs.allIds
    .map((id) => state.entities.runs.byId[id])
    .filter((r) => inRange(r.startTime, range));
  const total = runs.length;
  const success = runs.filter((r) => r.status === "success").length;
  const partial = runs.filter((r) => r.status === "partial_success").length;
  const failed = runs.filter((r) => r.status === "failed").length;
  const avgDurationMs =
    runs.filter((r) => typeof r.durationMs === "number").reduce((sum, r) => sum + (r.durationMs ?? 0), 0) /
    Math.max(1, runs.filter((r) => typeof r.durationMs === "number").length);
  const queueLength = state.entities.runs.allIds
    .map((id) => state.entities.runs.byId[id])
    .filter((r) => r.status === "queued" || r.status === "running").length;
  return {
    totalRuns: total,
    strictSuccessRate: total ? success / total : 0,
    partialSuccessCount: partial,
    failedCount: failed,
    avgDurationMs: Number.isFinite(avgDurationMs) ? Math.round(avgDurationMs) : 0,
    queueLength,
  };
}

export function selectRunTrendSeries(state: AppStoreState, range?: TimeRangeInput) {
  const buckets = new Map<string, { date: string; success: number; partial_success: number; failed: number }>();
  for (const runId of state.entities.runs.allIds) {
    const run = state.entities.runs.byId[runId];
    if (!inRange(run.startTime, range)) continue;
    const date = run.startTime.slice(0, 10);
    const bucket = buckets.get(date) ?? { date, success: 0, partial_success: 0, failed: 0 };
    if (run.status === "success") bucket.success += 1;
    if (run.status === "partial_success") bucket.partial_success += 1;
    if (run.status === "failed") bucket.failed += 1;
    buckets.set(date, bucket);
  }
  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function selectFailureHotspots(state: AppStoreState, range?: TimeRangeInput) {
  const map = new Map<string, { objectKey: string; objectName: string; failedCount: number }>();
  for (const runId of state.entities.runs.allIds) {
    const run = state.entities.runs.byId[runId];
    if (run.status !== "failed") continue;
    if (!inRange(run.startTime, range)) continue;
    const key = `${run.objectType}:${run.objectId}`;
    const row = map.get(key) ?? { objectKey: key, objectName: run.objectName, failedCount: 0 };
    row.failedCount += 1;
    map.set(key, row);
  }
  return Array.from(map.values()).sort((a, b) => b.failedCount - a.failedCount).slice(0, 10);
}

export function selectAlertDrawerViewModel(state: AppStoreState, alertId: string) {
  const alert = state.entities.alerts.byId[alertId];
  if (!alert) return undefined;
  const run = alert.runId ? state.entities.runs.byId[alert.runId] : undefined;
  const rule = state.entities.alertRules.byId[alert.ruleId];
  const sourceEvents = alert.sourceEventIds
    .map((id) => state.entities.runEvents.byId[id])
    .filter(Boolean)
    .sort((a, b) => b.time.localeCompare(a.time));
  return { alert, run, rule, sourceEvents };
}

export function selectWorkflowDetailHeaderViewModel(state: AppStoreState, workflowId: string): {
  workflow: Workflow;
  publishedVersion?: WorkflowVersion;
  draftVersion?: WorkflowVersion;
  runs: Run[];
} | undefined {
  const workflow = state.entities.workflows.byId[workflowId];
  if (!workflow) return undefined;
  const publishedVersion = workflow.currentPublishedVersionId
    ? state.entities.workflowVersions.byId[workflow.currentPublishedVersionId]
    : undefined;
  const draftVersion = workflow.draftVersionId
    ? state.entities.workflowVersions.byId[workflow.draftVersionId]
    : undefined;
  const runIds = state.indexes.runIdsByObjectKey[`workflow:${workflowId}`] ?? [];
  const runs = runIds.map((id) => state.entities.runs.byId[id]).filter(Boolean);
  return { workflow, publishedVersion, draftVersion, runs };
}

export function selectJobRuntimePolicyViewModel(state: AppStoreState, jobId: string): {
  job: Job;
  runtimePolicy: Job["runtimePolicy"];
  defaults: RuntimeDefaults;
} | undefined {
  const job = state.entities.jobs.byId[jobId];
  if (!job) return undefined;
  return {
    job,
    runtimePolicy: job.runtimePolicy,
    defaults: state.settings.runtimeDefaults,
  };
}

