export type Id = string;

export interface EntityState<T> {
  byId: Record<string, T>;
  allIds: string[];
}

export type RunStatus =
  | "pending"
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "partial_success"
  | "cancelled";

export type TriggerType =
  | "manual"
  | "schedule"
  | "webhook"
  | "upstream"
  | "retry"
  | "compensation";

export type ObjectType = "job" | "workflow";

export type RunEventSeverity = "info" | "warning" | "error" | "critical";

export type RunEventStage = "run" | "node" | "trigger" | "scheduler" | "connection";

export type RunEventType =
  | "run_created"
  | "run_started"
  | "run_completed_success"
  | "run_completed_failed"
  | "run_completed_partial_success"
  | "node_started"
  | "node_completed_success"
  | "node_completed_failed"
  | "node_retry_scheduled"
  | "node_skipped"
  | "node_compensation_success"
  | "node_join_evaluated"
  | "trigger_received"
  | "trigger_rejected"
  | "schedule_due"
  | "schedule_dispatched"
  | "connection_check_success"
  | "connection_check_failed"
  | "connection_offline"
  | "connection_recovered";

export interface Run {
  runId: Id;
  objectType: ObjectType;
  objectId: Id;
  objectName: string;
  triggerType: TriggerType;
  status: RunStatus;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  initiator: string;
  rootRunId?: Id;
  parentRunId?: Id;
  errorCode?: string;
  errorSummary?: string;
  isDryRun?: boolean;
  finalStatusReason?: string;
  triggerOptions?: TriggerExecutionOptionsPersisted;
  params?: Record<string, unknown>;
}

export interface RunEvent {
  eventId: Id;
  runId: Id;
  objectType?: ObjectType;
  objectId?: Id;
  objectName?: string;
  nodeId?: Id | null;
  nodeName?: string | null;
  eventType: RunEventType;
  stage: RunEventStage;
  severity: RunEventSeverity;
  time: string;
  sequence: number;
  message: string;
  errorCode?: string;
  payload?: Record<string, unknown>;
}

export type AlertStatus = "open" | "acknowledged" | "in_progress" | "resolved" | "muted";

export interface Alert {
  alertId: Id;
  status: AlertStatus;
  ruleId: Id;
  runId?: Id;
  objectType: ObjectType | "connection";
  objectId: Id;
  objectName: string;
  nodeId?: Id;
  errorCode?: string;
  summary: string;
  dedupKey: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  assignee?: string;
  mutedUntil?: string;
  resolvedAt?: string;
  sourceEventIds: Id[];
}

export type AlertThresholdMode = "single_event" | "count_in_window";

export interface AlertRule {
  ruleId: Id;
  name: string;
  enabled: boolean;
  eventMatchConfig: {
    eventTypes: RunEventType[];
    objectIds?: Id[];
  };
  thresholdConfig: {
    mode: AlertThresholdMode;
    count?: number;
    windowMin?: number;
  };
  dedupConfig: {
    windowMin: number;
  };
  notificationConfig: {
    channels: string[];
  };
  templateSource?: string;
}

export type FailureAction =
  | "terminate"
  | "skip"
  | "retry"
  | "compensate"
  | "continue_parallel";

export type RetryIntervalType = "fixed" | "exponential";
export type JoinPolicy = "all_success";

export interface WorkflowNodeExecutionConfig {
  timeoutSec?: number;
}

export interface WorkflowNodeRetryConfig {
  enabled?: boolean;
  maxAttempts?: number;
  intervalType?: RetryIntervalType;
  baseIntervalSec?: number;
  maxIntervalSec?: number;
}

export interface WorkflowNodeFailureConfig {
  onFailureAction?: FailureAction;
  afterRetryExhaustedAction?: FailureAction;
  alertOnFailure?: boolean;
}

export interface WorkflowNodeJoinConfig {
  joinPolicy?: JoinPolicy;
}

export interface WorkflowNodeConfig {
  execution?: WorkflowNodeExecutionConfig;
  retry?: WorkflowNodeRetryConfig;
  failure?: WorkflowNodeFailureConfig;
  join?: WorkflowNodeJoinConfig;
  [key: string]: unknown;
}

export type WorkflowNodeType = "start" | "end" | "job" | "condition" | "join";

export interface WorkflowGraphNode {
  id: Id;
  type: WorkflowNodeType;
  label: string;
  x: number;
  y: number;
  jobId?: Id;
  config?: WorkflowNodeConfig;
}

export interface WorkflowGraphEdge {
  id: Id;
  from: Id;
  to: Id;
  condition?: string;
}

export interface WorkflowVersion {
  versionId: Id;
  workflowId: Id;
  versionNo: string;
  versionType: "draft" | "published";
  graph: {
    nodes: WorkflowGraphNode[];
    edges: WorkflowGraphEdge[];
  };
  paramsSchema: TriggerParameterSchemaItem[];
  publishedAt?: string;
  publishedBy?: string;
  changeNote?: string;
}

export interface Workflow {
  workflowId: Id;
  name: string;
  enabled: boolean;
  currentPublishedVersionId?: Id;
  draftVersionId?: Id;
  tags: string[];
}

export interface JobRuntimePolicy {
  timeoutSec?: number;
  retry?: WorkflowNodeRetryConfig;
  failure?: WorkflowNodeFailureConfig;
}

export interface Job {
  jobId: Id;
  name: string;
  jobType: "sql" | "stored_proc" | "python" | "sql_agent" | "windows_task";
  connectionId?: Id;
  enabled: boolean;
  runtimePolicy?: JobRuntimePolicy;
}

export interface ParamMappingConfig {
  mappings: Array<{ source: string; target: string; required?: boolean }>;
}

export interface TriggerExecutionOptionsPersisted {
  priority?: "low" | "normal" | "high";
  commentTemplate?: string;
  dryRunForTestOnly?: boolean;
}

export interface Schedule {
  scheduleId: Id;
  targetType: ObjectType;
  targetId: Id;
  enabled: boolean;
  scheduleType: "cron" | "interval";
  scheduleConfig: Record<string, unknown>;
  paramMappingConfig?: ParamMappingConfig;
  triggerOptions?: TriggerExecutionOptionsPersisted;
  nextFireTime?: string;
  lastFireTime?: string;
  lastRunId?: Id;
}

export interface Trigger {
  triggerId: Id;
  triggerType: "manual" | "webhook" | "upstream";
  targetType: ObjectType;
  targetId: Id;
  enabled: boolean;
  paramMappingConfig?: ParamMappingConfig;
  securityConfig?: Record<string, unknown>;
  triggerOptions?: TriggerExecutionOptionsPersisted;
  lastTriggeredAt?: string;
  lastRunId?: Id;
}

export interface Connection {
  connectionId: Id;
  connectionType: "sql_server" | "windows_host";
  name: string;
  enabled: boolean;
  status: "online" | "offline" | "degraded" | "unknown";
  lastCheckAt?: string;
  lastSuccessAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  configSummary?: string;
  tags?: string[];
}

export interface ConnectionHealthCheckResult {
  connectionId: Id;
  connectionType: "sql_server" | "windows_host";
  checkType: "manual" | "scheduled";
  status: "success" | "failed" | "degraded";
  durationMs: number;
  errorCode?: string;
  message?: string;
  checkedAt: string;
  metrics?: Record<string, unknown>;
}

export interface RuntimeDefaults {
  defaultNodeTimeoutSec: number;
  defaultRetryEnabled: boolean;
  defaultMaxAttempts: number;
  defaultRetryIntervalType: RetryIntervalType;
  defaultRetryBaseIntervalSec: number;
  defaultRetryMaxIntervalSec: number;
  defaultAfterRetryExhaustedAction: FailureAction;
  defaultAlertOnFailure: boolean;
  defaultOnFailureAction: FailureAction;
  defaultJoinPolicy: JoinPolicy;
  defaultPriority: "low" | "normal" | "high";
  defaultDryRunVisible: boolean;
  defaultCommentRequired: boolean;
  defaultRunTimeoutSec?: number;
}

export interface SettingsState {
  runtimeDefaults: RuntimeDefaults;
}

export interface TriggerParameterSchemaItem {
  key: string;
  label: string;
  required?: boolean;
  defaultValue?: unknown;
  type?: "string" | "number" | "boolean";
}

export interface WorkflowEditorUiState {
  activeWorkflowId?: Id;
  selectedNodeId?: Id;
  selectedEdgeId?: Id;
  isDirty: boolean;
  validationResult?: { errors: string[]; warnings: string[] };
  nodeFieldSourcesByNodeId: Record<
    string,
    Record<
      string,
      {
        source: "settings_default" | "node_override" | "fixed_by_type" | "system_default";
        isOverridden: boolean;
      }
    >
  >;
}

export interface RunTriggerDialogUiState {
  open: boolean;
  mode: "manual_run" | "rerun";
  sourceType: "job" | "workflow" | "run";
  targetObjectType?: ObjectType;
  targetObjectId?: Id;
  sourceRunId?: Id;
  formDraft: {
    params: Record<string, unknown>;
    dryRun: boolean;
    priority: "low" | "normal" | "high";
    comment: string;
  };
  uiPolicy: {
    fieldVisibility: { dryRun: boolean; priority: boolean; comment: boolean };
    fieldRequired: { comment: boolean };
    fieldDisabled: { dryRun?: boolean; priority?: boolean };
  };
  validationErrors: Record<string, string>;
  submitState: "idle" | "validating" | "submitting" | "submit_failed";
}

export interface TriggerTestDialogState {
  open: boolean;
  triggerId?: Id;
  mode: "validate_only" | "trigger_run";
  payloadText: string;
  formDraft: {
    dryRun: boolean;
    priority: "low" | "normal" | "high";
    comment: string;
  };
  uiPolicy: {
    fieldVisibility: { dryRun: boolean };
    fieldRequired: { comment: boolean };
  };
  validationErrors: Record<string, string>;
  submitState: "idle" | "submitting" | "submit_failed";
}

export interface AlertsUiState {
  selectedAlertId?: Id;
  drawerOpen: boolean;
  filters: Record<string, unknown>;
}

export interface DashboardUiState {
  timeRange: { mode: "last_24h" | "last_7d"; from?: string; to?: string };
  autoRefreshEnabled: boolean;
}

export interface AppStoreState {
  entities: {
    workflows: EntityState<Workflow>;
    workflowVersions: EntityState<WorkflowVersion>;
    jobs: EntityState<Job>;
    schedules: EntityState<Schedule>;
    triggers: EntityState<Trigger>;
    runs: EntityState<Run>;
    runEvents: EntityState<RunEvent>;
    alerts: EntityState<Alert>;
    alertRules: EntityState<AlertRule>;
    connections: EntityState<Connection>;
  };
  indexes: {
    eventIdsByRunId: Record<string, string[]>;
    alertIdsByRunId: Record<string, string[]>;
    runIdsByObjectKey: Record<string, string[]>;
    workflowVersionIdsByWorkflowId: Record<string, string[]>;
    connectionHealthChecksByConnectionId: Record<string, ConnectionHealthCheckResult[]>;
    connectionEventIdsByConnectionId: Record<string, string[]>;
  };
  ui: {
    workflowEditor: WorkflowEditorUiState;
    runTriggerDialog: RunTriggerDialogUiState;
    triggerTestDialog: TriggerTestDialogState;
    alerts: AlertsUiState;
    dashboard: DashboardUiState;
  };
  settings: SettingsState;
  meta: {
    seedVersion: string;
    idSeq: number;
    lastMutationAt?: string;
  };
}

export interface TriggerExecutionOptionsResolved {
  priority: "low" | "normal" | "high";
  comment?: string;
  dryRun: boolean;
}

export interface OpenRunTriggerDialogInput {
  sourceType: "job" | "workflow" | "run";
  targetObjectType?: ObjectType;
  targetObjectId?: Id;
  sourceRunId?: Id;
  initialParams?: Record<string, unknown>;
  initialComment?: string;
  lockDryRun?: boolean;
  forceCommentRequired?: boolean;
}

export interface TriggerRunManualInput {
  objectType: ObjectType;
  objectId: Id;
  params: Record<string, unknown>;
  dryRun?: boolean;
  comment?: string;
  priority?: "low" | "normal" | "high";
  initiator: string;
  simulation?: "success" | "failed" | "partial_success";
  parentRunId?: Id;
}

