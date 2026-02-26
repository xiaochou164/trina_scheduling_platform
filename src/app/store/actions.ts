import type {
  Alert,
  AlertRule,
  AppStoreState,
  ConnectionHealthCheckResult,
  FailureAction,
  OpenRunTriggerDialogInput,
  Run,
  RunEvent,
  RunEventType,
  Trigger,
  TriggerExecutionOptionsResolved,
  TriggerRunManualInput,
  WorkflowGraphNode,
  WorkflowNodeConfig,
  WorkflowNodeType,
} from "../types/store";
import { objectKey, nowIso, nextId, safeJsonParse, severityForEventType } from "./utils";

function pushEntity<T extends { [key: string]: unknown }>(
  stateMap: { byId: Record<string, T>; allIds: string[] },
  id: string,
  item: T,
) {
  if (!stateMap.byId[id]) {
    stateMap.allIds.push(id);
  }
  stateMap.byId[id] = item;
}

function getRunEventSequence(state: AppStoreState, runId: string): number {
  return (state.indexes.eventIdsByRunId[runId]?.length ?? 0) + 1;
}

function buildNodeDefaults(state: AppStoreState, nodeType: WorkflowNodeType): {
  config: WorkflowNodeConfig;
  sources: Record<string, { source: "settings_default" | "fixed_by_type"; isOverridden: boolean }>;
} {
  const defaults = state.settings.runtimeDefaults;
  const sources: Record<string, { source: "settings_default" | "fixed_by_type"; isOverridden: boolean }> = {};
  const config: WorkflowNodeConfig = {};
  if (nodeType === "join") {
    config.join = { joinPolicy: defaults.defaultJoinPolicy };
    sources["join.joinPolicy"] = { source: "settings_default", isOverridden: false };
    return { config, sources };
  }
  if (nodeType === "job") {
    config.execution = { timeoutSec: defaults.defaultNodeTimeoutSec };
    config.retry = {
      enabled: defaults.defaultRetryEnabled,
      maxAttempts: defaults.defaultMaxAttempts,
      intervalType: defaults.defaultRetryIntervalType,
      baseIntervalSec: defaults.defaultRetryBaseIntervalSec,
      maxIntervalSec: defaults.defaultRetryMaxIntervalSec,
    };
    config.failure = {
      onFailureAction: defaults.defaultOnFailureAction,
      afterRetryExhaustedAction: defaults.defaultAfterRetryExhaustedAction,
      alertOnFailure: defaults.defaultAlertOnFailure,
    };
    for (const path of [
      "execution.timeoutSec",
      "retry.enabled",
      "retry.maxAttempts",
      "retry.intervalType",
      "retry.baseIntervalSec",
      "retry.maxIntervalSec",
      "failure.onFailureAction",
      "failure.afterRetryExhaustedAction",
      "failure.alertOnFailure",
    ]) {
      sources[path] = { source: "settings_default", isOverridden: false };
    }
  }
  return { config, sources };
}

function getObjectRef(state: AppStoreState, objectType: "job" | "workflow", objectId: string) {
  if (objectType === "workflow") {
    const wf = state.entities.workflows.byId[objectId];
    return { objectName: wf?.name ?? objectId };
  }
  const job = state.entities.jobs.byId[objectId];
  return { objectName: job?.name ?? objectId };
}

function dedupKeyForEvent(event: RunEvent): string {
  const objectId = String(event.objectId ?? "UNKNOWN_OBJECT");
  const nodeId = event.nodeId ?? "-";
  const errorCode = event.errorCode ?? "UNKNOWN";
  return `${objectId}|${nodeId}|${errorCode}`;
}

function matchesRule(rule: AlertRule, event: RunEvent): boolean {
  if (!rule.enabled) return false;
  if (!rule.eventMatchConfig.eventTypes.includes(event.eventType)) return false;
  if (rule.eventMatchConfig.objectIds && rule.eventMatchConfig.objectIds.length > 0) {
    if (!event.objectId || !rule.eventMatchConfig.objectIds.includes(event.objectId)) return false;
  }
  return true;
}

function isAlertCandidateEventType(eventType: RunEventType): boolean {
  return [
    "run_completed_failed",
    "node_completed_failed",
    "trigger_rejected",
    "connection_check_failed",
    "connection_offline",
  ].includes(eventType);
}

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const existing = cursor[key];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
}

export function createWorkflowNode(
  state: AppStoreState,
  input: {
    workflowId: string;
    type: WorkflowNodeType;
    label: string;
    x: number;
    y: number;
    jobId?: string;
  },
): { nodeId: string; node: WorkflowGraphNode } {
  const workflow = state.entities.workflows.byId[input.workflowId];
  if (!workflow?.draftVersionId) throw new Error("Workflow draft version missing");
  const draftVersion = state.entities.workflowVersions.byId[workflow.draftVersionId];
  if (!draftVersion) throw new Error("Draft version not found");

  const nodeId = nextId(state, "NODE");
  const { config, sources } = buildNodeDefaults(state, input.type);
  const node: WorkflowGraphNode = {
    id: nodeId,
    type: input.type,
    label: input.label,
    x: input.x,
    y: input.y,
    jobId: input.jobId,
    config,
  };
  draftVersion.graph.nodes.push(node);
  state.ui.workflowEditor.nodeFieldSourcesByNodeId[nodeId] = sources;
  state.ui.workflowEditor.isDirty = true;
  return { nodeId, node };
}

export function updateNodeConfig(
  state: AppStoreState,
  input: {
    workflowId: string;
    nodeId: string;
    patch: Record<string, unknown>;
    sourceMeta?: { path?: string };
  },
): { workflowId: string; nodeId: string } {
  const workflow = state.entities.workflows.byId[input.workflowId];
  if (!workflow?.draftVersionId) throw new Error("Workflow draft version missing");
  const draftVersion = state.entities.workflowVersions.byId[workflow.draftVersionId];
  const node = draftVersion?.graph.nodes.find((n) => n.id === input.nodeId);
  if (!node) throw new Error("Node not found");
  node.config = { ...(node.config ?? {}), ...input.patch };
  if (input.sourceMeta?.path) {
    state.ui.workflowEditor.nodeFieldSourcesByNodeId[input.nodeId] ??= {};
    state.ui.workflowEditor.nodeFieldSourcesByNodeId[input.nodeId][input.sourceMeta.path] = {
      source: "node_override",
      isOverridden: true,
    };
  }
  state.ui.workflowEditor.isDirty = true;
  return { workflowId: input.workflowId, nodeId: input.nodeId };
}

export function saveWorkflowDraft(state: AppStoreState, input: { workflowId: string }) {
  const workflow = state.entities.workflows.byId[input.workflowId];
  if (!workflow?.draftVersionId) throw new Error("Draft version missing");
  state.ui.workflowEditor.isDirty = false;
  return { workflowId: workflow.workflowId, draftVersionId: workflow.draftVersionId };
}

export function publishWorkflow(state: AppStoreState, input: { workflowId: string; user?: string }) {
  const workflow = state.entities.workflows.byId[input.workflowId];
  if (!workflow?.draftVersionId) throw new Error("Draft version missing");
  const draft = state.entities.workflowVersions.byId[workflow.draftVersionId];
  if (!draft) throw new Error("Draft not found");
  const publishedVersionId = nextId(state, "WFV");
  const published = {
    ...draft,
    versionId: publishedVersionId,
    versionType: "published" as const,
    publishedAt: nowIso(),
    publishedBy: input.user ?? "system",
  };
  pushEntity(state.entities.workflowVersions, publishedVersionId, published);
  state.indexes.workflowVersionIdsByWorkflowId[input.workflowId] ??= [];
  state.indexes.workflowVersionIdsByWorkflowId[input.workflowId].push(publishedVersionId);
  workflow.currentPublishedVersionId = publishedVersionId;
  state.ui.workflowEditor.isDirty = false;
  return { workflowId: input.workflowId, publishedVersionId };
}

export function openRunTriggerDialog(state: AppStoreState, input: OpenRunTriggerDialogInput) {
  const defaults = state.settings.runtimeDefaults;
  const dialog = state.ui.runTriggerDialog;
  let params = input.initialParams ?? {};
  let targetObjectType = input.targetObjectType;
  let targetObjectId = input.targetObjectId;

  if (input.sourceType === "run" && input.sourceRunId) {
    const sourceRun = state.entities.runs.byId[input.sourceRunId];
    if (!sourceRun) throw new Error("Source run not found");
    targetObjectType = sourceRun.objectType;
    targetObjectId = sourceRun.objectId;
    params = (sourceRun.params as Record<string, unknown>) ?? params;
  }

  dialog.open = true;
  dialog.mode = input.sourceType === "run" ? "rerun" : "manual_run";
  dialog.sourceType = input.sourceType;
  dialog.targetObjectType = targetObjectType;
  dialog.targetObjectId = targetObjectId;
  dialog.sourceRunId = input.sourceRunId;
  dialog.formDraft = {
    params,
    dryRun: false,
    priority: defaults.defaultPriority,
    comment: input.initialComment ?? "",
  };
  dialog.uiPolicy = {
    fieldVisibility: { dryRun: defaults.defaultDryRunVisible, priority: true, comment: true },
    fieldRequired: { comment: input.forceCommentRequired ?? defaults.defaultCommentRequired },
    fieldDisabled: { dryRun: input.lockDryRun ? true : undefined },
  };
  dialog.validationErrors = {};
  dialog.submitState = "idle";
  return { opened: true };
}

export function validateRunTriggerDialog(state: AppStoreState): { ok: boolean; fieldErrors: Record<string, string> } {
  const dialog = state.ui.runTriggerDialog;
  const errors: Record<string, string> = {};
  if (dialog.uiPolicy.fieldRequired.comment && !dialog.formDraft.comment.trim()) {
    errors.comment = "请填写触发说明";
  }
  dialog.validationErrors = errors;
  return { ok: Object.keys(errors).length === 0, fieldErrors: errors };
}

export function appendRunEvent(
  state: AppStoreState,
  input: Omit<RunEvent, "eventId" | "sequence" | "time" | "severity"> & {
    time?: string;
    severity?: RunEvent["severity"];
  },
): { eventId: string; event: RunEvent } {
  const eventId = nextId(state, "EVT");
  const event: RunEvent = {
    ...input,
    eventId,
    time: input.time ?? nowIso(),
    sequence: getRunEventSequence(state, input.runId),
    severity: input.severity ?? severityForEventType(input.eventType),
  };
  pushEntity(state.entities.runEvents, eventId, event);
  state.indexes.eventIdsByRunId[event.runId] ??= [];
  state.indexes.eventIdsByRunId[event.runId].push(eventId);

  if (event.stage === "connection") {
    const connId = String(event.payload?.connectionId ?? event.objectId ?? "");
    if (connId) {
      state.indexes.connectionEventIdsByConnectionId[connId] ??= [];
      state.indexes.connectionEventIdsByConnectionId[connId].push(eventId);
    }
  }
  return { eventId, event };
}

export function completeRun(
  state: AppStoreState,
  input: {
    runId: string;
    finalStatus: Run["status"];
    errorCode?: string;
    errorSummary?: string;
    finalStatusReason?: string;
  },
) {
  const run = state.entities.runs.byId[input.runId];
  if (!run) throw new Error("Run not found");
  const endTime = nowIso();
  run.status = input.finalStatus;
  run.endTime = endTime;
  run.durationMs = Math.max(0, new Date(endTime).getTime() - new Date(run.startTime).getTime());
  run.errorCode = input.errorCode;
  run.errorSummary = input.errorSummary;
  run.finalStatusReason = input.finalStatusReason;

  const completedEventType =
    input.finalStatus === "success"
      ? "run_completed_success"
      : input.finalStatus === "partial_success"
        ? "run_completed_partial_success"
        : "run_completed_failed";

  const { event } = appendRunEvent(state, {
    runId: run.runId,
    objectType: run.objectType,
    objectId: run.objectId,
    objectName: run.objectName,
    eventType: completedEventType,
    stage: "run",
    message: `Run completed: ${input.finalStatus}`,
    errorCode: input.errorCode,
    payload: {
      finalStatusReason: input.finalStatusReason,
    },
  });

  if (isAlertCandidateEventType(event.eventType)) {
    evaluateAlertRulesForEvent(state, { eventId: event.eventId });
  }

  return { runId: run.runId, finalStatus: run.status };
}

export function triggerRunManual(state: AppStoreState, input: TriggerRunManualInput) {
  const { objectName } = getObjectRef(state, input.objectType, input.objectId);
  const runId = nextId(state, "RUN");
  const startedAt = nowIso();
  const run: Run = {
    runId,
    objectType: input.objectType,
    objectId: input.objectId,
    objectName,
    triggerType: "manual",
    status: "running",
    startTime: startedAt,
    initiator: input.initiator,
    parentRunId: input.parentRunId,
    rootRunId: input.parentRunId ? state.entities.runs.byId[input.parentRunId]?.rootRunId ?? input.parentRunId : runId,
    isDryRun: input.dryRun ?? false,
    triggerOptions: { priority: input.priority ?? state.settings.runtimeDefaults.defaultPriority },
    params: input.params,
  };
  pushEntity(state.entities.runs, runId, run);
  const key = objectKey(input.objectType, input.objectId);
  state.indexes.runIdsByObjectKey[key] ??= [];
  state.indexes.runIdsByObjectKey[key].unshift(runId);

  const created = appendRunEvent(state, {
    runId,
    objectType: run.objectType,
    objectId: run.objectId,
    objectName: run.objectName,
    eventType: "run_created",
    stage: "run",
    message: "Run created",
    payload: { comment: input.comment, dryRun: run.isDryRun },
  });
  const started = appendRunEvent(state, {
    runId,
    objectType: run.objectType,
    objectId: run.objectId,
    objectName: run.objectName,
    eventType: "run_started",
    stage: "run",
    message: "Run started",
  });

  // Minimal mock execution engine for MVP demo
  appendRunEvent(state, {
    runId,
    objectType: run.objectType,
    objectId: run.objectId,
    objectName: run.objectName,
    nodeId: "NODE-JOB-1",
    nodeName: "Mock Job Node",
    eventType: "node_started",
    stage: "node",
    message: "Node started",
  });

  const simulation = input.simulation ?? "success";
  if (simulation === "failed") {
    const failedNode = appendRunEvent(state, {
      runId,
      objectType: run.objectType,
      objectId: run.objectId,
      objectName: run.objectName,
      nodeId: "NODE-JOB-1",
      nodeName: "Mock Job Node",
      eventType: "node_completed_failed",
      stage: "node",
      message: "Node failed",
      errorCode: "DB_CONN_TIMEOUT",
      payload: { failureAction: "terminate" satisfies FailureAction },
    });
    evaluateAlertRulesForEvent(state, { eventId: failedNode.eventId });
    completeRun(state, {
      runId,
      finalStatus: "failed",
      errorCode: "DB_CONN_TIMEOUT",
      errorSummary: "Database connection timeout",
      finalStatusReason: "Node failed and terminated workflow",
    });
  } else if (simulation === "partial_success") {
    const failedNode = appendRunEvent(state, {
      runId,
      objectType: run.objectType,
      objectId: run.objectId,
      objectName: run.objectName,
      nodeId: "NODE-JOB-1",
      nodeName: "Mock Job Node",
      eventType: "node_completed_failed",
      stage: "node",
      message: "Node failed",
      errorCode: "PY_BIZ_PARTIAL_RESULT",
      payload: { failureAction: "compensate" satisfies FailureAction },
    });
    evaluateAlertRulesForEvent(state, { eventId: failedNode.eventId });
    appendRunEvent(state, {
      runId,
      objectType: run.objectType,
      objectId: run.objectId,
      objectName: run.objectName,
      nodeId: "NODE-COMP-1",
      nodeName: "Compensation Node",
      eventType: "node_compensation_success",
      stage: "node",
      message: "Compensation succeeded",
      payload: { sourceNodeId: "NODE-JOB-1", finalRunImpact: "partial_success" },
    });
    completeRun(state, {
      runId,
      finalStatus: "partial_success",
      finalStatusReason: "Compensation succeeded after node failure",
    });
  } else {
    appendRunEvent(state, {
      runId,
      objectType: run.objectType,
      objectId: run.objectId,
      objectName: run.objectName,
      nodeId: "NODE-JOB-1",
      nodeName: "Mock Job Node",
      eventType: "node_completed_success",
      stage: "node",
      message: "Node completed",
    });
    completeRun(state, {
      runId,
      finalStatus: "success",
      finalStatusReason: "All nodes succeeded",
    });
  }

  return {
    runId,
    createdEventIds: [created.eventId, started.eventId],
  };
}

export function upsertAlertByDedupKey(
  state: AppStoreState,
  input: {
    ruleId: string;
    dedupKey: string;
    event: RunEvent;
  },
): { alertId: string; merged: boolean } {
  const existing = state.entities.alerts.allIds
    .map((id) => state.entities.alerts.byId[id])
    .find((a) => a.dedupKey === input.dedupKey && a.status !== "resolved");

  if (existing) {
    existing.count += 1;
    existing.lastSeen = input.event.time;
    existing.sourceEventIds.push(input.event.eventId);
    if (input.event.runId) {
      state.indexes.alertIdsByRunId[input.event.runId] ??= [];
      if (!state.indexes.alertIdsByRunId[input.event.runId].includes(existing.alertId)) {
        state.indexes.alertIdsByRunId[input.event.runId].push(existing.alertId);
      }
    }
    return { alertId: existing.alertId, merged: true };
  }

  const alertId = nextId(state, "ALERT");
  const alert: Alert = {
    alertId,
    status: "open",
    ruleId: input.ruleId,
    runId: input.event.runId,
    objectType:
      input.event.stage === "connection" ? "connection" : (input.event.objectType ?? "workflow"),
    objectId: String(input.event.objectId ?? input.event.payload?.connectionId ?? "UNKNOWN_OBJECT"),
    objectName: String(input.event.objectName ?? input.event.payload?.connectionName ?? "Unknown"),
    nodeId: input.event.nodeId ?? undefined,
    errorCode: input.event.errorCode,
    summary: input.event.message,
    dedupKey: input.dedupKey,
    count: 1,
    firstSeen: input.event.time,
    lastSeen: input.event.time,
    sourceEventIds: [input.event.eventId],
  };
  pushEntity(state.entities.alerts, alertId, alert);
  if (alert.runId) {
    state.indexes.alertIdsByRunId[alert.runId] ??= [];
    state.indexes.alertIdsByRunId[alert.runId].push(alertId);
  }
  return { alertId, merged: false };
}

export function evaluateAlertRulesForEvent(state: AppStoreState, input: { eventId: string }) {
  const event = state.entities.runEvents.byId[input.eventId];
  if (!event) throw new Error("Event not found");
  const matchedRuleIds: string[] = [];
  const generatedAlertIds: string[] = [];
  for (const ruleId of state.entities.alertRules.allIds) {
    const rule = state.entities.alertRules.byId[ruleId];
    if (!matchesRule(rule, event)) continue;

    if (rule.thresholdConfig.mode === "count_in_window") {
      const now = new Date(event.time).getTime();
      const windowMin = rule.thresholdConfig.windowMin ?? 30;
      const threshold = rule.thresholdConfig.count ?? 1;
      const count = state.entities.runEvents.allIds
        .map((id) => state.entities.runEvents.byId[id])
        .filter((candidate) => {
          if (!candidate) return false;
          if (!matchesRule(rule, candidate)) return false;
          const t = new Date(candidate.time).getTime();
          return now - t <= windowMin * 60_000 && now - t >= 0;
        }).length;
      if (count < threshold) continue;
    }

    matchedRuleIds.push(ruleId);
    const dedupKey = dedupKeyForEvent(event);
    const result = upsertAlertByDedupKey(state, { ruleId, dedupKey, event });
    generatedAlertIds.push(result.alertId);
  }
  return { matchedRuleIds, generatedAlertIds };
}

export function acknowledgeAlert(state: AppStoreState, input: { alertId: string; assignee?: string }) {
  const alert = state.entities.alerts.byId[input.alertId];
  if (!alert) throw new Error("Alert not found");
  alert.status = "acknowledged";
  if (input.assignee) alert.assignee = input.assignee;
  return { alertId: alert.alertId, status: alert.status };
}

export function resolveAlert(state: AppStoreState, input: { alertId: string }) {
  const alert = state.entities.alerts.byId[input.alertId];
  if (!alert) throw new Error("Alert not found");
  alert.status = "resolved";
  alert.resolvedAt = nowIso();
  return { alertId: alert.alertId, resolvedAt: alert.resolvedAt };
}

export function resolveTriggerExecutionOptions(state: AppStoreState, input: {
  objectTriggerOptions?: { priority?: "low" | "normal" | "high" };
  invocationOverrides?: Partial<TriggerExecutionOptionsResolved>;
}): TriggerExecutionOptionsResolved {
  const defaults = state.settings.runtimeDefaults;
  return {
    priority:
      input.invocationOverrides?.priority ??
      input.objectTriggerOptions?.priority ??
      defaults.defaultPriority ??
      "normal",
    comment: input.invocationOverrides?.comment,
    dryRun: input.invocationOverrides?.dryRun ?? false,
  };
}

export function runConnectionHealthCheck(
  state: AppStoreState,
  input: { connectionId: string; checkType?: "manual" | "scheduled"; simulatedStatus?: "success" | "failed" | "degraded" },
) {
  const conn = state.entities.connections.byId[input.connectionId];
  if (!conn) throw new Error("Connection not found");
  const checkedAt = nowIso();
  const simulatedStatus = input.simulatedStatus ?? "success";
  const result: ConnectionHealthCheckResult = {
    connectionId: conn.connectionId,
    connectionType: conn.connectionType,
    checkType: input.checkType ?? "manual",
    status: simulatedStatus,
    durationMs: 120,
    checkedAt,
    ...(simulatedStatus === "failed"
      ? { errorCode: "CONN_HEALTH_CHECK_FAILED", message: "Connection check failed" }
      : simulatedStatus === "degraded"
        ? { errorCode: "CONN_HIGH_LATENCY", message: "Latency high" }
        : {}),
  };
  state.indexes.connectionHealthChecksByConnectionId[conn.connectionId] ??= [];
  state.indexes.connectionHealthChecksByConnectionId[conn.connectionId].unshift(result);
  state.indexes.connectionHealthChecksByConnectionId[conn.connectionId] =
    state.indexes.connectionHealthChecksByConnectionId[conn.connectionId].slice(0, 20);

  conn.lastCheckAt = checkedAt;
  if (simulatedStatus === "success") {
    conn.status = "online";
    conn.lastSuccessAt = checkedAt;
    conn.lastErrorCode = undefined;
    conn.lastErrorMessage = undefined;
  } else if (simulatedStatus === "degraded") {
    conn.status = "degraded";
    conn.lastErrorCode = result.errorCode;
    conn.lastErrorMessage = result.message;
  } else {
    const prevStatus = conn.status;
    conn.status = "offline";
    conn.lastErrorCode = result.errorCode;
    conn.lastErrorMessage = result.message;
    appendRunEvent(state, {
      runId: `SYS-CONN-${conn.connectionId}`,
      eventType: "connection_check_failed",
      stage: "connection",
      message: result.message ?? "Connection check failed",
      errorCode: result.errorCode,
      payload: { connectionId: conn.connectionId, connectionName: conn.name, checkType: result.checkType },
      objectId: conn.connectionId,
      objectName: conn.name,
    });
    if (prevStatus !== "offline") {
      const offlineEvent = appendRunEvent(state, {
        runId: `SYS-CONN-${conn.connectionId}`,
        eventType: "connection_offline",
        stage: "connection",
        message: "Connection offline",
        errorCode: result.errorCode,
        payload: { connectionId: conn.connectionId, connectionName: conn.name },
        objectId: conn.connectionId,
        objectName: conn.name,
      });
      evaluateAlertRulesForEvent(state, { eventId: offlineEvent.eventId });
    }
    return { connectionId: conn.connectionId, status: conn.status };
  }

  const successType = simulatedStatus === "success" ? "connection_check_success" : "connection_check_failed";
  appendRunEvent(state, {
    runId: `SYS-CONN-${conn.connectionId}`,
    eventType: successType,
    stage: "connection",
    message: result.message ?? (simulatedStatus === "success" ? "Connection healthy" : "Connection degraded"),
    errorCode: result.errorCode,
    payload: { connectionId: conn.connectionId, connectionName: conn.name, checkType: result.checkType },
    objectId: conn.connectionId,
    objectName: conn.name,
  });
  return { connectionId: conn.connectionId, status: conn.status };
}

export function openTriggerDetailTestDialog(state: AppStoreState, input: { triggerId: string; mode?: "validate_only" | "trigger_run" }) {
  const trigger = state.entities.triggers.byId[input.triggerId];
  if (!trigger) throw new Error("Trigger not found");
  const defaults = state.settings.runtimeDefaults;
  state.ui.triggerTestDialog = {
    open: true,
    triggerId: input.triggerId,
    mode: input.mode ?? "validate_only",
    payloadText: "{\n  \"bizDate\": \"2026-02-26\"\n}",
    formDraft: {
      dryRun: false,
      priority: trigger.triggerOptions?.priority ?? defaults.defaultPriority,
      comment: "",
    },
    uiPolicy: {
      fieldVisibility: { dryRun: defaults.defaultDryRunVisible },
      fieldRequired: { comment: defaults.defaultCommentRequired },
    },
    validationErrors: {},
    submitState: "idle",
  };
  return { opened: true };
}

export function submitTriggerTest(state: AppStoreState, input?: { mode?: "validate_only" | "trigger_run" }) {
  const dialog = state.ui.triggerTestDialog;
  if (!dialog.open || !dialog.triggerId) throw new Error("Trigger test dialog is not open");
  const trigger = state.entities.triggers.byId[dialog.triggerId];
  if (!trigger) throw new Error("Trigger not found");
  if (input?.mode) dialog.mode = input.mode;

  const payloadParse = safeJsonParse(dialog.payloadText);
  const errors: Record<string, string> = {};
  if (!payloadParse.ok) errors.payloadText = "Payload JSON 格式错误";
  if (dialog.uiPolicy.fieldRequired.comment && !dialog.formDraft.comment.trim()) {
    errors.comment = "请填写触发说明";
  }
  dialog.validationErrors = errors;
  if (Object.keys(errors).length > 0) {
    dialog.submitState = "submit_failed";
    return { ok: false, fieldErrors: errors };
  }

  const triggerReceived = appendRunEvent(state, {
    runId: `SYS-TRIGGER-${trigger.triggerId}`,
    eventType: "trigger_received",
    stage: "trigger",
    message: "Trigger payload received",
    objectId: trigger.targetId,
    objectType: trigger.targetType,
    objectName: getObjectRef(state, trigger.targetType, trigger.targetId).objectName,
    payload: { triggerId: trigger.triggerId },
  });

  if (dialog.mode === "validate_only") {
    return { ok: true, mode: "validate_only", eventId: triggerReceived.eventId };
  }

  const resolved = resolveTriggerExecutionOptions(state, {
    objectTriggerOptions: { priority: trigger.triggerOptions?.priority },
    invocationOverrides: {
      priority: dialog.formDraft.priority,
      dryRun: dialog.uiPolicy.fieldVisibility.dryRun ? dialog.formDraft.dryRun : false,
      comment: dialog.formDraft.comment,
    },
  });

  const result = triggerRunManual(state, {
    objectType: trigger.targetType,
    objectId: trigger.targetId,
    initiator: "trigger-test",
    params: (payloadParse as { ok: true; value: unknown }).value as Record<string, unknown>,
    dryRun: resolved.dryRun,
    comment: resolved.comment,
    priority: resolved.priority,
    simulation: "success",
  });

  return { ok: true, mode: "trigger_run", runId: result.runId };
}

