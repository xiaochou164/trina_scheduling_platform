import { runtimeDefaults } from "./defaults";
import type {
  AlertRule,
  AppStoreState,
  Connection,
  Job,
  RunTriggerDialogUiState,
  Schedule,
  Trigger,
  Workflow,
  WorkflowGraphNode,
  WorkflowVersion,
} from "../types/store";

function entityState<T extends { [k: string]: unknown }>(items: T[], idKey: keyof T) {
  const byId: Record<string, T> = {};
  const allIds: string[] = [];
  for (const item of items) {
    const id = String(item[idKey]);
    byId[id] = item;
    allIds.push(id);
  }
  return { byId, allIds };
}

function createSeedWorkflowGraphNodes(): WorkflowGraphNode[] {
  return [
    { id: "NODE-START-1", type: "start", label: "Start", x: 120, y: 80 },
    {
      id: "NODE-JOB-1",
      type: "job",
      label: "Extract Cost Data",
      x: 120,
      y: 220,
      jobId: "JOB-1001",
      config: {
        execution: { timeoutSec: runtimeDefaults.defaultNodeTimeoutSec },
        retry: {
          enabled: runtimeDefaults.defaultRetryEnabled,
          maxAttempts: runtimeDefaults.defaultMaxAttempts,
          intervalType: runtimeDefaults.defaultRetryIntervalType,
          baseIntervalSec: runtimeDefaults.defaultRetryBaseIntervalSec,
          maxIntervalSec: runtimeDefaults.defaultRetryMaxIntervalSec,
        },
        failure: {
          onFailureAction: runtimeDefaults.defaultOnFailureAction,
          afterRetryExhaustedAction: runtimeDefaults.defaultAfterRetryExhaustedAction,
          alertOnFailure: runtimeDefaults.defaultAlertOnFailure,
        },
      },
    },
    { id: "NODE-END-1", type: "end", label: "End", x: 120, y: 360 },
  ];
}

function createInitialRunTriggerDialogState(): RunTriggerDialogUiState {
  return {
    open: false,
    mode: "manual_run",
    sourceType: "workflow",
    formDraft: {
      params: {},
      dryRun: false,
      priority: runtimeDefaults.defaultPriority,
      comment: "",
    },
    uiPolicy: {
      fieldVisibility: {
        dryRun: runtimeDefaults.defaultDryRunVisible,
        priority: true,
        comment: true,
      },
      fieldRequired: {
        comment: runtimeDefaults.defaultCommentRequired,
      },
      fieldDisabled: {},
    },
    validationErrors: {},
    submitState: "idle",
  };
}

export function createInitialAppStoreState(): AppStoreState {
  const workflows: Workflow[] = [
    {
      workflowId: "WF-1001",
      name: "月结流程",
      enabled: true,
      currentPublishedVersionId: "WFV-1001-P1",
      draftVersionId: "WFV-1001-D1",
      tags: ["财务", "月结"],
    },
  ];

  const workflowVersions: WorkflowVersion[] = [
    {
      versionId: "WFV-1001-P1",
      workflowId: "WF-1001",
      versionNo: "1.0.0",
      versionType: "published",
      graph: {
        nodes: createSeedWorkflowGraphNodes(),
        edges: [
          { id: "EDGE-1", from: "NODE-START-1", to: "NODE-JOB-1" },
          { id: "EDGE-2", from: "NODE-JOB-1", to: "NODE-END-1" },
        ],
      },
      paramsSchema: [{ key: "bizDate", label: "业务日期", required: true, type: "string" }],
    },
    {
      versionId: "WFV-1001-D1",
      workflowId: "WF-1001",
      versionNo: "1.0.1-draft",
      versionType: "draft",
      graph: {
        nodes: createSeedWorkflowGraphNodes(),
        edges: [
          { id: "EDGE-1", from: "NODE-START-1", to: "NODE-JOB-1" },
          { id: "EDGE-2", from: "NODE-JOB-1", to: "NODE-END-1" },
        ],
      },
      paramsSchema: [{ key: "bizDate", label: "业务日期", required: true, type: "string" }],
    },
  ];

  const jobs: Job[] = [
    {
      jobId: "JOB-1001",
      name: "成本数据抽取",
      jobType: "sql",
      connectionId: "CONN-1001",
      enabled: true,
      runtimePolicy: {
        timeoutSec: runtimeDefaults.defaultNodeTimeoutSec,
        retry: {
          enabled: runtimeDefaults.defaultRetryEnabled,
          maxAttempts: runtimeDefaults.defaultMaxAttempts,
          intervalType: runtimeDefaults.defaultRetryIntervalType,
          baseIntervalSec: runtimeDefaults.defaultRetryBaseIntervalSec,
          maxIntervalSec: runtimeDefaults.defaultRetryMaxIntervalSec,
        },
        failure: {
          onFailureAction: runtimeDefaults.defaultOnFailureAction,
          afterRetryExhaustedAction: runtimeDefaults.defaultAfterRetryExhaustedAction,
          alertOnFailure: runtimeDefaults.defaultAlertOnFailure,
        },
      },
    },
    {
      jobId: "JOB-1002",
      name: "报表生成脚本",
      jobType: "python",
      connectionId: "CONN-2001",
      enabled: true,
    },
  ];

  const schedules: Schedule[] = [
    {
      scheduleId: "SCH-1001",
      targetType: "workflow",
      targetId: "WF-1001",
      enabled: true,
      scheduleType: "cron",
      scheduleConfig: { cron: "0 1 * * *" },
      triggerOptions: { priority: runtimeDefaults.defaultPriority, commentTemplate: "schedule:月结流程" },
    },
  ];

  const triggers: Trigger[] = [
    {
      triggerId: "TRG-1001",
      triggerType: "webhook",
      targetType: "workflow",
      targetId: "WF-1001",
      enabled: true,
      securityConfig: { signatureEnabled: true },
      triggerOptions: { priority: runtimeDefaults.defaultPriority },
    },
  ];

  const alertRules: AlertRule[] = [
    {
      ruleId: "RULE-1001",
      name: "运行失败立即告警",
      enabled: true,
      eventMatchConfig: { eventTypes: ["run_completed_failed", "connection_offline"] },
      thresholdConfig: { mode: "single_event" },
      dedupConfig: { windowMin: 30 },
      notificationConfig: { channels: ["email"] },
      templateSource: "run_failed_default",
    },
    {
      ruleId: "RULE-1002",
      name: "节点失败连续2次告警",
      enabled: true,
      eventMatchConfig: { eventTypes: ["node_completed_failed"] },
      thresholdConfig: { mode: "count_in_window", count: 2, windowMin: 30 },
      dedupConfig: { windowMin: 30 },
      notificationConfig: { channels: ["dingtalk"] },
      templateSource: "node_failed_count",
    },
  ];

  const connections: Connection[] = [
    {
      connectionId: "CONN-1001",
      connectionType: "sql_server",
      name: "SQL-PROD-01",
      enabled: true,
      status: "online",
      configSummary: "10.0.0.11:1433",
      tags: ["财务"],
    },
    {
      connectionId: "CONN-2001",
      connectionType: "windows_host",
      name: "WIN-HOST-01",
      enabled: true,
      status: "online",
      configSummary: "10.0.0.21",
      tags: ["ETL"],
    },
  ];

  return {
    entities: {
      workflows: entityState(workflows, "workflowId"),
      workflowVersions: entityState(workflowVersions, "versionId"),
      jobs: entityState(jobs, "jobId"),
      schedules: entityState(schedules, "scheduleId"),
      triggers: entityState(triggers, "triggerId"),
      runs: { byId: {}, allIds: [] },
      runEvents: { byId: {}, allIds: [] },
      alerts: { byId: {}, allIds: [] },
      alertRules: entityState(alertRules, "ruleId"),
      connections: entityState(connections, "connectionId"),
    },
    indexes: {
      eventIdsByRunId: {},
      alertIdsByRunId: {},
      runIdsByObjectKey: {},
      workflowVersionIdsByWorkflowId: {
        "WF-1001": ["WFV-1001-P1", "WFV-1001-D1"],
      },
      connectionHealthChecksByConnectionId: {},
      connectionEventIdsByConnectionId: {},
    },
    ui: {
      workflowEditor: {
        activeWorkflowId: "WF-1001",
        isDirty: false,
        nodeFieldSourcesByNodeId: {},
      },
      runTriggerDialog: createInitialRunTriggerDialogState(),
      triggerTestDialog: {
        open: false,
        mode: "validate_only",
        payloadText: "{}",
        formDraft: {
          dryRun: false,
          priority: runtimeDefaults.defaultPriority,
          comment: "",
        },
        uiPolicy: {
          fieldVisibility: { dryRun: runtimeDefaults.defaultDryRunVisible },
          fieldRequired: { comment: runtimeDefaults.defaultCommentRequired },
        },
        validationErrors: {},
        submitState: "idle",
      },
      alerts: {
        drawerOpen: false,
        filters: {},
      },
      dashboard: {
        timeRange: { mode: "last_24h" },
        autoRefreshEnabled: false,
      },
    },
    settings: {
      runtimeDefaults: { ...runtimeDefaults },
    },
    meta: {
      seedVersion: "v3.3-phase1",
      idSeq: 1000,
    },
  };
}

