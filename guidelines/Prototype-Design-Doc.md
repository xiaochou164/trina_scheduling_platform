# 调度平台原型设计文档（迭代版）

> 说明：本文件基于当前原型代码与讨论结果整理，作为后续原型细化的唯一增量文档。后续讨论确认的新规则，应直接追加到本文件对应章节（版本记录/决策记录/字段规范）。

## 1. 文档目标

- 统一调度平台原型的产品逻辑、对象边界、状态模型与事件规范
- 为后续原型页面细化与交互联动提供一致依据
- 作为后续讨论的持续更新载体（迭代版）

## 2. 原型定位与主逻辑闭环

平台定位：

- 面向企业内部的调度编排与运行监控平台
- 支持 `Job` 与 `Workflow` 两类调度对象
- 强调可视化编排、统一运行追踪、告警治理与配置优化闭环

主逻辑闭环（v1）：

`Connection -> Job -> Workflow -> Schedule/Trigger -> Run -> Event -> AlertRule -> Alert -> 人工处理/优化配置 -> 再运行`

说明：

- `Job` 是底层执行能力（SQL Agent / 存储过程 / Python / Windows Task 等）
- `Workflow` 是平台主推对象，用于编排多个 `Job` 与控制节点
- `Schedule/Trigger` 可绑定 `Job` 或 `Workflow`
- 每次执行生成统一 `Run`
- `Run` 产出结构化 `RunEvent`
- `AlertRule` 基于事件进行判定并生成 `Alert`

## 3. 已确认核心决策（冻结 v1）

### 3.1 调度对象边界

- `Schedule/Trigger` 允许绑定 `Job` 和 `Workflow`
- 平台主推 `Workflow`（`Job` 作为底层能力/节点模板）

### 3.2 运行模型

- 统一 `Run` 模型
- 通过 `objectType` 区分 `job | workflow`
- 运行中心、告警中心统一消费 Run 数据

### 3.3 失败处理语义（节点级）

工作流节点支持配置失败后的后续操作：

- `terminate`（终止）
- `skip`（跳过）
- `retry`（重试）
- `compensate`（走补偿）
- `continue_parallel`（继续并行）

### 3.4 告警触发机制

- 采用 `事件采集 + 规则判定` 双层模型
- 先产生事件，再由规则系统判断是否生成/聚合告警

### 3.5 环境模型

- 取消 `Prod / Pre / Dev` 概念
- 后续原型移除环境切换相关交互与配置

## 4. 顶层 Run 状态模型（v1）

### 4.1 Run 状态枚举

- `pending`
- `queued`
- `running`
- `success`
- `failed`
- `partial_success`
- `cancelled`

### 4.2 已确认判定规则

- `partial_success` 作为 Run 顶层正式状态保留
- 节点失败后选择“跳过”，工作流最终状态为 `partial_success`
- 补偿成功后默认工作流最终状态为 `partial_success`

### 4.3 Run 状态流转（文本版）

- `pending -> queued -> running`
- `running -> success | failed | partial_success | cancelled`
- 重跑不回写原 Run 状态，而是创建新 Run（可通过 `parentRunId/rootRunId` 关联）

## 5. Workflow 节点失败策略语义（v1）

### 5.1 `terminate`

- 节点失败后立即终止工作流
- 顶层 Run 状态为 `failed`

### 5.2 `skip`

- 节点失败后跳过该节点影响并继续后续流程
- 顶层 Run 状态最终为 `partial_success`

### 5.3 `retry`

- 节点按重试策略执行多次尝试
- 重试成功则节点成功，流程继续
- 重试耗尽后执行 `afterRetryExhausted` 动作（建议字段单独配置）

### 5.4 `compensate`

- 节点失败后触发补偿节点/补偿逻辑
- 补偿成功：顶层 Run 默认 `partial_success`
- 补偿失败：顶层 Run 为 `failed`

### 5.5 `continue_parallel`

- 当前并行分支失败不阻塞其他分支继续执行
- 最终结果由汇聚节点策略决定

## 6. 并行与汇聚策略（v1）

### 6.1 默认汇聚策略（已确认）

- `joinPolicy = all_success`

### 6.2 语义说明

- 所有分支必须成功，汇聚节点才通过
- 任一分支失败时，汇聚默认判定失败（除非后续引入容错汇聚策略）

### 6.3 后续可扩展（未纳入 v1 默认）

- `all_done`
- `any_success`
- `quorum(n)`

## 7. 统一 Run 模型（建议字段）

> 本节为原型前端与后续后端设计的共同参考字段，不要求一次实现完整。

- `runId`
- `objectType` (`job | workflow`)
- `objectId`
- `objectName`
- `triggerType` (`manual | schedule | webhook | upstream | retry | compensation`)
- `triggerSourceId`（scheduleId / triggerId，可空）
- `status`
- `startTime`
- `endTime`
- `durationMs`
- `initiator`
- `parentRunId`
- `rootRunId`
- `params`（触发参数快照）
- `context`（运行上下文快照）
- `failedNodeId`（Job Run 可空）
- `errorCode`
- `errorSummary`
- `timelineSummary`
- `logRef`

补充（Workflow 场景）：

- `nodeRuns[]`（或独立表存储节点执行明细）

## 8. 告警模型（v1）

### 8.1 总体架构

- 事件采集层：采集运行/触发/调度/连接事件
- 规则判定层：根据规则匹配事件、阈值、去重、抑制
- 告警实体层：统一展示与处理告警

### 8.2 Alert 状态（建议）

- `open`
- `acknowledged`
- `in_progress`
- `resolved`
- `muted`

### 8.3 告警去重键（已确认）

默认维度：

- `对象 + 节点 + 错误码`

推荐格式：

- `dedupKey = objectId + "|" + (nodeId || "-") + "|" + (errorCode || "UNKNOWN")`

示例：

- `WF-1001|node-3|DB_CONN_TIMEOUT`

## 8.A AlertRule 条件构造器（v1 简化版）

> 目标：为 `Alerts / AlertRules` 页面提供一套可落地的规则配置模型，支撑“事件采集 -> 规则判定 -> 告警生成/聚合”的闭环。v1 先做简化版，优先覆盖高频场景。

### 8.A.1 设计目标与范围（v1）

v1 需要支持：

- 按事件类型匹配（如 `node_completed_failed`、`run_timeout`）
- 按对象范围匹配（全部 / 指定对象 / 标签）
- 按错误码匹配（可选）
- 连续次数与时间窗口（如连续失败 N 次）
- 去重窗口（分钟）
- 通知渠道（邮件/企业微信/钉钉等）
- 基础状态管理（启用/停用）

v1 暂不强制支持：

- 复杂布尔表达式（AND/OR 嵌套）
- 规则间依赖/抑制链
- 值班日历/升级链条的复杂路由

### 8.A.2 规则引擎的输入与输出

输入：

- `RunEvent`
- 当前已有 `Alert` 集合（用于去重/聚合）
- 规则配置 `AlertRule`

输出：

- `NoOp`（不匹配/不处理）
- `CreateAlert`
- `UpdateAlert`（命中去重键聚合）
- `CreateAlert + Notify`
- `UpdateAlert + Notify`（如达到阈值升级）

### 8.A.3 AlertRule 数据模型（v1 建议）

```ts
interface AlertRule {
  ruleId: string;
  name: string;
  enabled: boolean;
  description?: string;

  // 1) 匹配范围
  targetScope: AlertRuleTargetScope;
  eventTypes: RunEventType[];
  errorCodes?: string[]; // 可选，空表示不限制
  severities?: ("warning" | "error" | "critical")[]; // 可选

  // 2) 阈值条件（v1 简化）
  threshold: AlertRuleThreshold;

  // 3) 聚合与去重
  dedup: AlertRuleDedupConfig;

  // 4) 告警与通知动作
  actions: AlertRuleActionConfig;

  // 5) 元信息
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

#### A. 目标范围 `targetScope`

```ts
type AlertRuleTargetScope =
  | { mode: "all" }
  | { mode: "objects"; objects: Array<{ objectType: "job" | "workflow"; objectId: string }> }
  | { mode: "tags"; tags: string[] };
```

说明：

- v1 页面可只实现 `all` + `objects`
- `tags` 先保留字段，后续接 `Settings` 标签体系

#### B. 阈值条件 `threshold`

```ts
type AlertRuleThreshold =
  | {
      mode: "single_event"; // 单事件即触发
    }
  | {
      mode: "count_in_window"; // 时间窗口计数阈值
      operator: ">=";
      count: number;
      windowMinutes: number;
      groupBy: "dedupKey"; // v1 固定
    };
```

推荐 v1 支持两个常见模式：

- `single_event`：例如“节点失败即告警”
- `count_in_window`：例如“10 分钟内连续失败 >= 3 次”

#### C. 去重与聚合 `dedup`

```ts
interface AlertRuleDedupConfig {
  enabled: boolean; // v1 建议默认 true
  keyStrategy: "object_node_error"; // 对应已确认的默认去重键
  aggregateWindowMinutes: number; // 例如 10 分钟
  reopenOnResolved: boolean; // 同键新事件是否重开已解决告警
}
```

说明：

- `keyStrategy` v1 固定为 `object_node_error`
- `aggregateWindowMinutes` 与 `threshold.windowMinutes` 可以相同，也可以分开配置（v1 页面可先合并为一个字段）

#### D. 动作配置 `actions`

```ts
interface AlertRuleActionConfig {
  createAlert: boolean; // v1 固定 true
  notify: {
    enabled: boolean;
    channels: Array<"email" | "wecom" | "dingtalk">;
  };
  autoAssign?: {
    enabled: boolean;
    assignee?: string;
  };
  escalation?: {
    enabled: boolean;
    whenCountGte?: number; // 达到聚合次数后升级
    severityTo?: "critical";
    extraChannels?: Array<"email" | "wecom" | "dingtalk">;
  };
}
```

### 8.A.4 v1 规则判定流程（简化）

建议判定顺序（保证行为可解释）：

1. 基础过滤
- 规则是否启用
- 事件类型是否匹配
- 对象范围是否匹配
- 错误码/severity 是否匹配（若配置）

2. 阈值判断
- `single_event`：直接通过
- `count_in_window`：
  - 在时间窗口内按 `dedupKey` 统计命中事件数
  - 满足阈值才通过

3. 去重与聚合
- 计算 `dedupKey`
- 查找窗口内同键告警（`open/acknowledged/in_progress`）
- 若命中：
  - 更新告警（`count`、`lastSeen`、`sourceEventIds`）
- 若未命中：
  - 新建告警

4. 动作执行
- 创建/更新告警
- 按渠道发送通知（可 mock）
- 若触发升级条件，提升告警等级并追加通知

### 8.A.5 v1 页面交互（`AlertRules`）建议

建议 `AlertRules` 页将“规则卡片”升级为可编辑表单（先简化）。

#### 规则编辑表单分组

1. 基础信息
- 规则名称
- 启用状态
- 描述

2. 匹配条件
- 事件类型（多选）
- 目标范围（全部 / 指定对象）
- 错误码（多选或标签输入，可选）
- 级别（可选）

3. 阈值条件
- 触发模式：`单次事件` / `窗口计数`
- 若 `窗口计数`：
  - 次数阈值
  - 时间窗口（分钟）

4. 聚合与去重
- 去重开关（默认开）
- 聚合窗口（分钟）
- 已解决后同键新事件：`重开` / `新建`（v1 可先默认重开）

5. 通知动作
- 通知开关
- 通道多选（邮件 / 企业微信 / 钉钉）
- 升级条件（可选）

#### 页面展示建议（列表卡片）

在现有 `AlertRules` 卡片基础上增加以下摘要信息：

- 事件类型数量 / 示例
- 阈值模式（单次 / 连续 N 次）
- 聚合窗口
- 去重策略（固定显示 `对象+节点+错误码`）
- 通知渠道

### 8.A.6 v1 表单校验规则

- `name` 必填且唯一（前端 mock 可本地校验）
- `eventTypes` 至少选择 1 个
- `targetScope.mode=objects` 时对象列表不能为空
- `threshold.mode=count_in_window` 时：
  - `count >= 2`（建议）
  - `windowMinutes >= 1`
- `dedup.aggregateWindowMinutes >= 1`
- `notify.enabled=true` 时至少选择 1 个渠道

### 8.A.7 示例规则（可直接用于原型 mock）

#### 规则 R1：关键工作流节点失败即告警

```json
{
  "ruleId": "R1",
  "name": "关键工作流节点失败即告警",
  "enabled": true,
  "targetScope": {
    "mode": "objects",
    "objects": [
      { "objectType": "workflow", "objectId": "WF-1001" }
    ]
  },
  "eventTypes": ["node_completed_failed"],
  "threshold": { "mode": "single_event" },
  "dedup": {
    "enabled": true,
    "keyStrategy": "object_node_error",
    "aggregateWindowMinutes": 10,
    "reopenOnResolved": true
  },
  "actions": {
    "createAlert": true,
    "notify": {
      "enabled": true,
      "channels": ["wecom", "email"]
    }
  }
}
```

#### 规则 R2：数据库连接超时 10 分钟内连续 3 次告警升级

```json
{
  "ruleId": "R2",
  "name": "数据库连接超时连续3次升级",
  "enabled": true,
  "targetScope": { "mode": "all" },
  "eventTypes": ["node_completed_failed"],
  "errorCodes": ["DB_CONN_TIMEOUT"],
  "threshold": {
    "mode": "count_in_window",
    "operator": ">=",
    "count": 3,
    "windowMinutes": 10,
    "groupBy": "dedupKey"
  },
  "dedup": {
    "enabled": true,
    "keyStrategy": "object_node_error",
    "aggregateWindowMinutes": 10,
    "reopenOnResolved": true
  },
  "actions": {
    "createAlert": true,
    "notify": {
      "enabled": true,
      "channels": ["wecom"]
    },
    "escalation": {
      "enabled": true,
      "whenCountGte": 3,
      "severityTo": "critical",
      "extraChannels": ["email"]
    }
  }
}
```

### 8.A.8 与 `RunEvent` / `Alert` / `ErrorCode` 的关系（落地）

- 规则匹配对象是 `RunEvent`
- 规则聚合主键依赖 `RunEvent.errorCode` 的标准化质量（见 `9.A ErrorCode`）
- 告警实体 `Alert` 是规则判定结果，不是事件本身
- 同一事件可命中多条规则（v1 原型可先限制为命中首条或按优先级首条）

### 8.A.9 v1 原型实现建议（最小闭环）

建议优先实现 3 个规则模板：

1. `节点失败即告警`（single_event）
2. `连接离线即告警`（single_event）
3. `连接超时连续N次`（count_in_window）

并在 `AlertRules` 页面先用“结构化表单 + 预设模板”方式实现，暂不做复杂拖拽式条件构造器。

## 9. RunEvent 事件字典与字段规范（v1）

### 9.1 设计目标

- 支撑 `Run详情` 时间线与日志摘要
- 支撑 `事件采集 -> 规则判定 -> 告警`
- 支撑仪表盘统计（失败、重试、部分成功）

### 9.2 RunEvent 统一字段

- `eventId`
- `runId`
- `rootRunId`
- `parentRunId`
- `objectType` (`job | workflow`)
- `objectId`
- `objectName`
- `nodeId`（Job Run 可空）
- `nodeName`（可空）
- `eventType`
- `stage` (`run | node | trigger | scheduler | connection`)
- `status`
- `severity` (`info | warning | error | critical`)
- `time`（ISO 时间）
- `sequence`（同 run 内递增）
- `triggerType`（可空）
- `errorCode`（可空）
- `message`
- `payload`（结构化详情）
- `tags`
- `isAlertCandidate`（默认 true）

### 9.3 事件类型字典（v1）

#### A. Run 级事件（`stage = run`）

- `run_created`
- `run_queued`
- `run_started`
- `run_completed_success`
- `run_completed_failed`
- `run_completed_partial_success`
- `run_cancel_requested`
- `run_cancelled`
- `run_timeout`
- `run_rerun_requested`

#### B. Node 级事件（`stage = node`）

- `node_started`
- `node_completed_success`
- `node_completed_failed`
- `node_skipped`
- `node_retry_scheduled`
- `node_retry_started`
- `node_retry_exhausted`
- `node_compensation_started`
- `node_compensation_success`
- `node_compensation_failed`
- `node_branch_continued`
- `node_join_evaluated`

#### C. Trigger 级事件（`stage = trigger`）

- `trigger_received`
- `trigger_validated`
- `trigger_rejected`
- `trigger_mapped`
- `trigger_dispatched`

#### D. Scheduler 级事件（`stage = scheduler`）

- `schedule_due`
- `schedule_dispatched`
- `schedule_skipped`
- `schedule_parse_failed`

#### E. Connection 级事件（`stage = connection`）

- `connection_check_success`
- `connection_check_failed`
- `connection_offline`
- `connection_recovered`

### 9.4 事件状态枚举（建议）

- `created`
- `queued`
- `started`
- `success`
- `failed`
- `partial_success`
- `retrying`
- `skipped`
- `cancel_requested`
- `cancelled`
- `evaluated`
- `rejected`

### 9.5 severity 默认映射（建议）

- `info`：如 `run_created`、`run_started`、`node_started`
- `warning`：如 `node_skipped`、`node_retry_scheduled`、`node_branch_continued`
- `error`：如 `node_completed_failed`、`trigger_rejected`、`connection_check_failed`
- `critical`：如 `run_completed_failed`、`run_timeout`、`connection_offline`

### 9.6 payload 结构规范（关键示例）

#### `node_completed_failed`

建议 `payload` 字段：

- `attempt`
- `maxAttempts`
- `durationMs`
- `errorType`
- `errorMessage`
- `stack`（可选）
- `failureAction`
- `afterRetryExhausted`（可选）

#### `node_retry_scheduled`

建议 `payload` 字段：

- `attempt`
- `maxAttempts`
- `intervalSec`
- `intervalType`
- `nextRetryAt`
- `reason`

#### `node_compensation_success`

建议 `payload` 字段：

- `sourceNodeId`
- `sourceNodeName`
- `compensationNodeId`
- `compensationNodeName`
- `durationMs`
- `finalRunImpact`（建议值：`partial_success`）

#### `node_join_evaluated`

建议 `payload` 字段：

- `joinPolicy`
- `branchTotal`
- `branchSuccess`
- `branchFailed`
- `branchSkipped`
- `result`（`pass | fail`）
- `reason`

#### `run_completed_partial_success`

建议 `payload` 字段：

- `successNodes`
- `failedNodes`
- `skippedNodes`
- `compensatedNodes`
- `reasonSummary`

#### `trigger_rejected`

建议 `payload` 字段：

- `triggerId`
- `triggerType`
- `rejectReason`（如 `signature_invalid / ip_not_allowed / schema_invalid`）
- `sourceIp`
- `requestId`（可选）

### 9.7 告警规则默认消费的事件（建议）

- `run_completed_failed`
- `run_timeout`
- `node_completed_failed`
- `node_retry_exhausted`
- `connection_offline`
- `trigger_rejected`

### 9.8 v1 最小事件集（先实现即可形成闭环）

- `run_created`
- `run_started`
- `run_completed_success`
- `run_completed_failed`
- `run_completed_partial_success`
- `node_started`
- `node_completed_success`
- `node_completed_failed`
- `node_retry_scheduled`
- `node_skipped`
- `node_compensation_success`
- `node_join_evaluated`

## 9.A ErrorCode 错误码规范（v1.3）

> 目标：统一 `RunEvent.errorCode` 命名与语义，服务于告警去重（对象+节点+错误码）、重试策略（`retryOnErrorCodes`）、统计分析与排障检索。

### 9.A.1 设计原则

- 错误码应稳定、可枚举、可搜索，避免直接使用原始错误消息作为主键
- 错误码与错误消息分离：
  - `errorCode`：标准化分类码（用于规则/统计/去重）
  - `message`：具体错误描述（用于排障）
- 优先表达“可操作语义”（如连接超时、认证失败、参数校验失败）
- 可保留原始底层错误码到 `payload.dbErrorCode` / `payload.rawErrorCode`

### 9.A.2 命名规则（建议）

格式：

- `DOMAIN_CATEGORY_DETAIL`

示例：

- `DB_CONN_TIMEOUT`
- `PY_SCRIPT_NOT_FOUND`
- `TRIGGER_SIGNATURE_INVALID`

命名约束：

- 全大写，下划线分隔
- 不包含动态值（如表名、IP、行号）
- 不直接使用中文

### 9.A.3 错误码元数据（建议）

每个错误码建议附带元信息（文档级或代码级映射表）：

- `code`
- `domain`（`DB | PY | TRIGGER | SCHEDULE | CONNECTION | WORKFLOW | SYSTEM | BIZ`）
- `severityDefault`（`warning | error | critical`）
- `retryHint`（`yes | no | conditional`）
- `description`
- `typicalAction`（排查建议）

### 9.A.4 错误码分层

#### A. 技术错误码（平台/执行器可稳定生成）

用于连接、超时、认证、语法、网络、系统异常等。

#### B. 业务错误码（脚本/存储过程/业务流程返回）

用于参数不合法、校验失败、业务条件不满足、部分成功等。

说明：

- 业务错误码建议由 Python 脚本或存储过程显式返回
- 平台只做透传与映射，不随意改写（必要时做前缀归一）

### 9.A.5 v1 推荐错误码字典（按域）

#### 1. 通用 / 工作流（`WF_*` / `RUN_*`）

- `WF_CONFIG_INVALID`
  - 含义：工作流配置无效（发布前漏检或运行前动态校验失败）
  - `retryHint=no`

- `WF_NODE_NOT_FOUND`
  - 含义：运行期引用节点不存在/被删除
  - `retryHint=no`

- `WF_JOIN_CONDITION_FAILED`
  - 含义：汇聚节点 `all_success` 条件不满足
  - `retryHint=no`

- `RUN_TIMEOUT`
  - 含义：Run 顶层超时
  - `retryHint=conditional`

- `RUN_CANCELLED_BY_USER`
  - 含义：人工终止
  - `retryHint=no`

#### 2. Python 执行（`PY_*`）

- `PY_SCRIPT_NOT_FOUND`
  - 含义：脚本路径不存在
  - `retryHint=no`

- `PY_ENV_NOT_FOUND`
  - 含义：Python 环境不可用/配置错误
  - `retryHint=no`

- `PY_EXEC_TIMEOUT`
  - 含义：Python 节点执行超时
  - `retryHint=conditional`

- `PY_PROCESS_EXIT_NONZERO`
  - 含义：进程非零退出，未提供更细粒度错误码
  - `retryHint=conditional`

- `PY_RESULT_PARSE_FAILED`
  - 含义：结构化结果 JSON 解析失败
  - `retryHint=no`

- `PY_SUBSTEP_FAILED`
  - 含义：子步骤失败（未细分时的通用码）
  - `retryHint=conditional`

说明：

- 若脚本内部有更明确业务错误码，优先使用业务错误码（如 `BIZ_VALIDATE_FAILED`），不要都落到 `PY_PROCESS_EXIT_NONZERO`

#### 3. 数据库 / SQL / 存储过程（`DB_*` / `SQL_*` / `SP_*`）

连接与执行技术错误：

- `DB_CONN_TIMEOUT`
  - 含义：数据库连接超时
  - `retryHint=yes`

- `DB_CONN_AUTH_FAILED`
  - 含义：认证失败
  - `retryHint=no`

- `DB_CONN_REFUSED`
  - 含义：连接被拒绝/实例不可达
  - `retryHint=conditional`

- `DB_QUERY_TIMEOUT`
  - 含义：SQL 执行超时
  - `retryHint=conditional`

- `SQL_SYNTAX_ERROR`
  - 含义：SQL 语法错误
  - `retryHint=no`

- `SQL_PERMISSION_DENIED`
  - 含义：权限不足
  - `retryHint=no`

- `SQL_DEADLOCK_DETECTED`
  - 含义：死锁
  - `retryHint=yes`

存储过程与业务返回：

- `SP_RETURN_CODE_FAILED`
  - 含义：存储过程 `RETURN` 返回失败码（未细分）
  - `retryHint=conditional`

- `SP_OUTPUT_STATUS_FAILED`
  - 含义：输出参数状态码指示失败
  - `retryHint=conditional`

- `SP_OUTPUT_STATUS_PARTIAL_SUCCESS`
  - 含义：输出参数状态码指示部分成功
  - `retryHint=no`

SQL Agent：

- `SQL_AGENT_JOB_FAILED`
  - 含义：Agent Job 整体失败
  - `retryHint=conditional`

- `SQL_AGENT_STEP_FAILED`
  - 含义：Agent Job 某步骤失败
  - `retryHint=conditional`

#### 4. 触发器（`TRIGGER_*` / `WEBHOOK_*`）

- `TRIGGER_SIGNATURE_INVALID`
  - 含义：签名校验失败
  - `retryHint=no`

- `TRIGGER_IP_NOT_ALLOWED`
  - 含义：来源 IP 不在白名单
  - `retryHint=no`

- `TRIGGER_PAYLOAD_SCHEMA_INVALID`
  - 含义：Payload 结构不符合要求
  - `retryHint=no`

- `TRIGGER_MAPPING_FAILED`
  - 含义：Payload 到工作流参数映射失败
  - `retryHint=no`

- `TRIGGER_TARGET_DISABLED`
  - 含义：目标对象已禁用
  - `retryHint=no`

#### 5. 调度计划（`SCHEDULE_*`）

- `SCHEDULE_CRON_PARSE_FAILED`
  - 含义：Cron 表达式解析失败
  - `retryHint=no`

- `SCHEDULE_WINDOW_MISSED`
  - 含义：错过时间窗/不在可执行窗口内
  - `retryHint=conditional`

- `SCHEDULE_TARGET_NOT_FOUND`
  - 含义：计划绑定目标不存在
  - `retryHint=no`

- `SCHEDULE_DISPATCH_FAILED`
  - 含义：调度到执行队列失败
  - `retryHint=conditional`

#### 6. 连接与资源（`CONN_*` / `HOST_*`）

- `CONN_OFFLINE`
  - 含义：连接离线/不可达
  - `retryHint=conditional`

- `CONN_HEALTHCHECK_FAILED`
  - 含义：健康检查失败
  - `retryHint=conditional`

- `HOST_AGENT_OFFLINE`
  - 含义：Windows Host Agent 离线
  - `retryHint=conditional`

- `HOST_AGENT_VERSION_UNSUPPORTED`
  - 含义：Agent 版本不兼容
  - `retryHint=no`

#### 7. 系统平台（`SYS_*`）

- `SYS_QUEUE_OVERFLOW`
  - 含义：执行队列拥塞/入队失败
  - `retryHint=conditional`

- `SYS_INTERNAL_ERROR`
  - 含义：平台内部异常（兜底）
  - `retryHint=conditional`

- `SYS_EVENT_PERSIST_FAILED`
  - 含义：事件写入失败
  - `retryHint=conditional`

### 9.A.6 业务错误码规范（`BIZ_*` 前缀建议）

建议业务侧（Python 脚本 / 存储过程）输出统一前缀错误码：

- `BIZ_VALIDATE_FAILED`
- `BIZ_DATA_INCOMPLETE`
- `BIZ_DATA_CONFLICT`
- `BIZ_RULE_NOT_MATCHED`
- `BIZ_PARTIAL_RESULT`

说明：

- 业务错误码由业务团队维护语义，平台只做透传与展示
- 告警规则可按 `BIZ_*` 前缀配置不同通知策略

### 9.A.7 与 retry 策略的关系（落地建议）

`retry.retryOnErrorCodes` 建议优先使用标准技术错误码：

推荐默认可重试（示例）：

- `DB_CONN_TIMEOUT`
- `DB_QUERY_TIMEOUT`
- `SQL_DEADLOCK_DETECTED`
- `PY_EXEC_TIMEOUT`
- `CONN_HEALTHCHECK_FAILED`
- `SYS_QUEUE_OVERFLOW`

推荐默认不重试（示例）：

- `SQL_SYNTAX_ERROR`
- `SQL_PERMISSION_DENIED`
- `TRIGGER_SIGNATURE_INVALID`
- `TRIGGER_PAYLOAD_SCHEMA_INVALID`
- `WF_CONFIG_INVALID`
- `PY_SCRIPT_NOT_FOUND`

### 9.A.8 与告警去重的关系（已确认策略落地）

默认去重键：

- `对象 + 节点 + 错误码`

落地建议：

- 若 `errorCode` 缺失，统一写 `UNKNOWN`
- 尽量在执行器层完成错误码标准化，避免前端拼接时不一致
- 原始错误消息放入 `message` 与 `payload.rawErrorMessage`，不参与去重键

### 9.A.9 v1 原型实现建议（最小集）

若先做原型联动，建议先落这 15 个高频错误码：

- `DB_CONN_TIMEOUT`
- `DB_QUERY_TIMEOUT`
- `SQL_SYNTAX_ERROR`
- `SQL_AGENT_JOB_FAILED`
- `SQL_AGENT_STEP_FAILED`
- `PY_PROCESS_EXIT_NONZERO`
- `PY_EXEC_TIMEOUT`
- `PY_RESULT_PARSE_FAILED`
- `TRIGGER_SIGNATURE_INVALID`
- `TRIGGER_PAYLOAD_SCHEMA_INVALID`
- `SCHEDULE_CRON_PARSE_FAILED`
- `SCHEDULE_DISPATCH_FAILED`
- `CONN_OFFLINE`
- `WF_JOIN_CONDITION_FAILED`
- `SYS_INTERNAL_ERROR`

## 9.B Run -> RunEvent -> Alert 示例数据流（v1.4）

> 目标：用可落地的示例串起统一 `Run` 模型、`RunEvent` 事件字典、`AlertRule` 规则判定与 `Alert` 聚合行为，作为原型联动与 mock 数据组织参考。

### 9.B.1 示例说明与约定

本节给出 3 个典型案例：

1. 成功执行（`success`）
2. 失败后补偿成功（`partial_success`）
3. 连续失败触发告警并按去重键聚合

统一约定：

- `dedupKey = objectId + "|" + (nodeId || "-") + "|" + (errorCode || "UNKNOWN")`
- 示例规则：
  - `R1`：节点失败即告警（关键对象）
  - `R2`：同一去重键 10 分钟内聚合
  - `R3`：部分成功连续 N 次告警（默认关闭）

### 9.B.2 案例一：工作流手动触发，整体成功（`success`）

场景：

- 对象：`Workflow / 财务月结流程`
- 触发方式：`manual`
- 结果：所有节点成功，汇聚通过（`all_success`）

数据流（摘要）：

1. 创建 `Run(status=running, triggerType=manual)`
2. 产出 `run_created`、`run_started`
3. 各节点产出 `node_started / node_completed_success`
4. 汇聚节点产出 `node_join_evaluated(result=pass)`
5. 顶层产出 `run_completed_success`
6. 不生成 `Alert`

### 9.B.3 案例二：节点失败后补偿成功，顶层 `partial_success`

场景：

- 对象：`Workflow / 财务月结流程`
- 节点：`报表生成（python）`
- 节点失败后触发补偿节点（降级通知）并成功
- 顶层 Run 收敛为 `partial_success`

数据流（摘要）：

1. `run_started`
2. `node_completed_failed(errorCode=PY_PROCESS_EXIT_NONZERO, failureAction=compensate)`
3. `node_compensation_started`
4. `node_compensation_success(payload.finalRunImpact=partial_success)`
5. `run_completed_partial_success`

告警建议：

- 若规则 `R1` 开启，`node_completed_failed` 可触发 1 条告警
- `run_completed_partial_success` 默认不直接告警（除非配置“部分成功规则”）

### 9.B.4 案例三：连续失败触发告警并按去重键聚合

场景：

- 对象：`Workflow / 财务月结流程`
- 节点：`财务数据抽取（sql-agent）`
- 错误码：`DB_CONN_TIMEOUT`
- 10 分钟内连续 3 次失败

第一次失败：

1. 产出 `node_completed_failed(errorCode=DB_CONN_TIMEOUT)`
2. 命中规则 `R1`
3. 计算 `dedupKey = WF-1001|node-1|DB_CONN_TIMEOUT`
4. 无同键开放告警 -> 创建 `Alert(count=1, status=open)`

第二/三次失败（窗口内）：

1. 命中相同 `dedupKey`
2. 不新建告警，更新原告警：
   - `count += 1`
   - `lastSeen` 更新
   - `sourceEventIds` 追加
3. 可选：达到阈值后升级通知（如提升 severity）

### 9.B.5 对页面联动的指导

- `RunsList`：以 `Run.status` 渲染最终状态（含 `partial_success`）
- `RunDetail`：按 `RunEvent.sequence/time` 渲染时间线，显示补偿/重试/汇聚细节
- `AlertsList`：按 `Alert` 展示聚合结果（`count/firstSeen/lastSeen/dedupKey`）
- `Dashboard`：KPI 统计来自 `Run.status`；错误热点可按 `RunEvent.errorCode` 聚合

### 9.B.6 v1 原型 mock 数据组织建议

建议前端 mock 层拆分：

- `runs[]`
- `runEventsByRunId: Record<string, RunEvent[]>`
- `alertRules[]`
- `alerts[]`

推荐联动方式（原型阶段）：

1. 手动触发 -> 新增 `Run` + 初始 `RunEvent`
2. 模拟执行 -> 追加 `RunEvent` 并更新 `Run.status`
3. 事件流入规则引擎（mock）-> 更新/创建 `Alert`

## 10. retry / compensate / manual trigger / partial_success 展示规则（v1.1）

### 10.0 WorkflowNodeConfig 节点配置 Schema（v1.2）

> 目标：为工作流编辑器（`WorkflowEditor` + `NodeInspector`）提供统一节点配置结构，支撑执行、失败处理、重试、补偿、汇聚与变量映射。

#### 10.0.1 设计原则

- 节点配置分层，避免所有字段平铺
- 执行类节点与控制类节点共享“通用执行策略”
- 类型特有配置放入 `typeConfig`
- 保留扩展字段以兼容后续节点类型（子流程、文件到达等）

#### 10.0.2 节点分类（与原型组件一致）

执行节点（执行外部任务）：

- `sql-agent`
- `stored-proc`
- `sql-script`
- `python`
- `windows-task`
- （后续）`subflow`

控制节点（流程控制）：

- `start`
- `end`
- `condition`
- `parallel`（汇聚/并行控制）
- `delay`
- `retry`（若保留为显式节点，后续可与节点级 retry 策略并存）

事件节点（触发/通知类）：

- `webhook`
- `file-arrival`
- `upstream`
- `notification`（建议预留，便于“发送通知”与“告警通知”区分）

#### 10.0.3 节点配置总结构（建议）

```ts
interface WorkflowNodeConfig {
  meta?: NodeMetaConfig;
  binding?: NodeBindingConfig;
  inputMapping?: NodeInputMappingConfig;
  outputMapping?: NodeOutputMappingConfig;
  execution?: NodeExecutionPolicyConfig;
  failure?: NodeFailurePolicyConfig;
  retry?: NodeRetryPolicyConfig;
  compensation?: NodeCompensationConfig;
  join?: NodeJoinPolicyConfig; // 仅 parallel/join 节点使用
  condition?: NodeConditionConfig; // 仅 condition 节点使用
  typeConfig?: Record<string, unknown>; // 类型特有配置
  ui?: NodeUiConfig; // 编辑器内展示与辅助状态（不参与运行）
}
```

#### 10.0.4 通用配置分组

##### A. `meta`（基础元信息）

建议字段：

- `displayName`：节点显示名称（可覆盖节点 label）
- `description`：节点说明
- `tags`：标签（后续用于筛选/统计）
- `owner`：责任人（可选）
- `enabled`：是否启用（默认 true）
- `critical`：是否关键节点（关键节点失败可触发更高等级告警）

说明：

- `enabled=false` 时，运行期可视为跳过，并在事件中产出 `node_skipped`

##### B. `binding`（对象绑定）

用于执行类节点引用 `Job` 模板或外部对象。

建议字段：

- `bindingType`：`job_template | direct_config | none`
- `jobId`：引用 Job 模板 ID（`bindingType=job_template` 时使用）
- `jobVersion`：可选，锁定版本（后续）
- `resourceRef`：连接/主机引用（`direct_config` 时可用）

说明：

- 平台主推执行节点优先引用 `Job`，降低工作流内重复配置
- `direct_config` 作为补充模式（原型已在 NodeInspector 中体现）

##### C. `inputMapping`（入参映射）

建议字段：

- `mode`：`inherit | custom`
- `mappings[]`

`mappings[]` 结构建议：

- `targetKey`
- `sourceExpr`（如 `${workflow.DATE}`、`${prev.rows}`）
- `required`
- `defaultValue`
- `transform`（后期，如 `toDate`, `trim`, `jsonPath`）

##### D. `outputMapping`（出参映射）

建议字段：

- `publishToContext`：是否发布到上下文（默认 true）
- `mappings[]`

`mappings[]` 结构建议：

- `sourceKey`（节点输出字段）
- `targetKey`（上下文字段，如 `ctx.finance.rows`）
- `scope`：`workflow | local`

##### E. `execution`（通用执行策略）

建议字段：

- `timeoutSec`
- `queuePolicy`：`default | high_priority | serial_only`（原型可先不展示）
- `concurrencyKey`（后期）
- `continueOnCancelRequest`（后期）
- `alertOnStart`（通常 false）
- `alertOnFailure`（常用）
- `emitEvents`（默认 true）

#### 10.0.5 失败、重试、补偿、汇聚（核心）

##### A. `failure`（节点失败策略）

```ts
interface NodeFailurePolicyConfig {
  onFailureAction: "terminate" | "skip" | "retry" | "compensate" | "continue_parallel";
  afterRetryExhausted?: "terminate" | "skip" | "compensate" | "continue_parallel";
  escalateSeverity?: "warning" | "error" | "critical";
  markRunAsPartialSuccessOnHandledFailure?: boolean; // 建议默认 true
}
```

说明：

- `onFailureAction=retry` 时，实际重试策略由 `retry` 配置提供
- `afterRetryExhausted` 仅在启用重试时生效
- `markRunAsPartialSuccessOnHandledFailure` 用于“跳过/补偿成功”等场景的结果归因（v1 可默认行为，不必暴露 UI）

##### B. `retry`（节点重试策略）

```ts
interface NodeRetryPolicyConfig {
  enabled: boolean;
  maxAttempts: number; // 不含首次执行（已确认）
  intervalType: "fixed" | "exponential";
  baseIntervalSec: number;
  maxIntervalSec?: number;
  retryOnErrorCodes?: string[]; // 可选白名单
  retryOnErrorTypes?: ("timeout" | "connection" | "network" | "temporary")[];
}
```

说明：

- 若 `enabled=false`，`failure.onFailureAction=retry` 视为配置错误（发布前校验报错）
- `retryOnErrorCodes` 与 `retryOnErrorTypes` 均为空时，默认表示“任意失败均可重试”

##### C. `compensation`（补偿配置）

```ts
interface NodeCompensationConfig {
  mode: "none" | "node"; // v1 先支持 node
  compensationTargetNodeId?: string;
  triggerCondition?: "on_failure" | "after_retry_exhausted"; // v1 可固定 on_failure
  onCompensationSuccess?: "continue" | "end_partial_success"; // 建议默认 end_partial_success
  onCompensationFailure?: "terminate";
}
```

说明：

- v1 仅支持 `mode=node`
- 补偿成功默认使顶层 Run 收敛到 `partial_success`

##### D. `join`（汇聚策略，仅汇聚节点）

```ts
interface NodeJoinPolicyConfig {
  joinPolicy: "all_success"; // v1 默认且唯一
  timeoutSec?: number;
  failFast?: boolean; // 默认 true，可后续扩展
}
```

说明：

- v1 只允许 `all_success`
- 文档保留字段形态，后续扩展 `all_done/any_success/quorum`

#### 10.0.6 控制节点专用配置

##### A. `condition`（条件节点）

```ts
interface NodeConditionConfig {
  expression: string; // 如 if ${prev.status} == 'SUCCESS'
  engine?: "simple_expr"; // v1 固定
  onEvaluateError?: "terminate" | "skip";
}
```

说明：

- 条件表达式校验失败属于配置错误，应在发布前校验拦截
- 运行期求值异常则按 `onEvaluateError` 处理（默认 `terminate`）

##### B. `delay` 节点（放入 `typeConfig` 或单独结构）

建议字段：

- `delayValue`
- `delayUnit`（`sec | min | hour | day`）
- `allowSkipByManualRerun`（后期）

#### 10.0.7 执行节点类型特有配置（`typeConfig`）

> v1 不要求一次做全，先定义结构便于 UI 与数据统一。

##### A. `sql-agent`

建议字段：

- `instanceRef`
- `jobName`
- `stepName`（可选）
- `runAsAccount`（可选）

##### B. `stored-proc`

建议字段：

- `instanceRef`
- `database`
- `procedureName`
- `parameters`（键值/模板）

##### C. `sql-script`

建议字段：

- `instanceRef`
- `database`
- `scriptRef` 或 `inlineSql`
- `parameters`

##### D. `python`

建议字段：

- `hostRef`
- `pythonEnvRef`
- `scriptPath`
- `argsTemplate`
- `workingDirectory`
- `statusReportMode`（`exit_code | stdout_json | result_file_json`）
- `resultFilePath`（可选）
- `parsePartialSuccess`（布尔，默认 false）
- `subStepReportEnabled`（布尔，默认 false）

##### E. `windows-task`

建议字段：

- `hostRef`
- `taskPath`
- `taskName`

##### F. `webhook`（事件/通知节点）

建议字段：

- `url`
- `method`
- `headers`
- `bodyTemplate`
- `timeoutSec`

#### 10.0.8 编辑器辅助配置（`ui`）

该配置不参与运行，仅用于前端编辑体验。

建议字段：

- `collapsed`：是否折叠显示
- `colorOverride`：颜色覆盖（后期）
- `notes`：设计备注
- `lastValidatedAt`
- `validationState`：`unknown | valid | invalid`
- `validationErrors[]`

说明：

- `ui.validationState` 可用于画布红点提示（当前 `WorkflowCanvas` 已有 invalid 红点雏形）

#### 10.0.9 发布前校验规则（与 schema 对应）

建议最小校验集：

- 执行节点必须具备 `binding` 或有效 `typeConfig`
- `failure.onFailureAction=retry` 时必须 `retry.enabled=true`
- `retry.maxAttempts >= 1`
- `intervalType=exponential` 时建议有 `maxIntervalSec`
- `onFailureAction=compensate` 时必须存在有效 `compensationTargetNodeId`
- 汇聚节点必须有 `join.joinPolicy`（v1 固定 `all_success`）
- 条件节点必须有 `condition.expression`
- 禁止补偿目标指向自身（避免直接环）

#### 10.0.10 NodeInspector 字段映射建议（v1）

为便于实现，建议在 `NodeInspector` 中按以下分组渲染：

1. 基础信息
- `meta.displayName`
- `meta.description`
- `meta.enabled`

2. 绑定与执行配置（按节点类型展示）
- `binding`
- `typeConfig`
- `execution.timeoutSec`

3. 失败策略
- `failure.onFailureAction`
- `retry.*`（条件显示）
- `failure.afterRetryExhausted`（启用重试时显示）
- `compensation.compensationTargetNodeId`（条件显示）
- `execution.alertOnFailure`

4. 变量映射
- `inputMapping.mappings`
- `outputMapping.mappings`

5. 控制策略（按节点类型）
- `condition.expression`
- `join.joinPolicy`

#### 10.0.10.A NodeInspector 表单布局与交互细化（v1.6）

> 目标：将 `WorkflowNodeConfig` 映射为可直接实现的右侧属性面板布局与交互规范，统一字段分组、显示条件和保存行为。

##### A. 面板总体结构（建议）

1. 顶部栏
- 节点名称（标题）
- 节点类型标签
- 关闭按钮

2. 表单主体（可滚动）
- 分组折叠区（Accordion）

3. 底部操作栏（固定）
- `应用`
- `重置`
- `删除节点`

交互建议：

- 默认展开 `基础信息`、`失败策略`
- 切换选中节点时，若存在未保存草稿，弹出确认提示（放弃/保存并切换）

##### B. 分组顺序（统一）

建议固定为：

1. `基础信息`
2. `绑定与执行`
3. `失败策略`
4. `变量映射`
5. `控制策略`
6. `高级设置`

说明：

- 分组是否显示取决于节点类型
- 顺序固定有助于减少学习成本

##### C. 节点类型与分组显示矩阵（v1）

执行节点（`sql-agent / stored-proc / sql-script / python / windows-task`）：

- 基础信息
- 绑定与执行
- 失败策略
- 变量映射
- 高级设置

条件节点（`condition`）：

- 基础信息
- 控制策略
- 失败策略（用于表达式求值异常处理）
- 高级设置

汇聚节点（`parallel`/join）：

- 基础信息
- 控制策略（join）
- 失败策略（可选）
- 高级设置

延时节点（`delay`）：

- 基础信息
- 控制策略（delay）
- 高级设置

起止节点（`start / end`）：

- 基础信息（简化）
- 高级设置（备注）

##### D. 各分组字段细化

###### 1. 基础信息

字段：

- `meta.displayName`（必填）
- `meta.description`
- `meta.enabled`
- `meta.critical`
- `meta.tags`（v1 可占位）

交互提示：

- `enabled=false` 时提示“运行时将跳过该节点”
- `critical=true` 时提示“规则命中时建议提升告警优先级”

###### 2. 绑定与执行（执行节点）

子块 A：绑定方式

- `binding.bindingType`（引用作业 / 直接配置）
- `binding.jobId`（引用作业时显示）
- `binding.jobVersion`（可选）

子块 B：执行策略

- `execution.timeoutSec`
- `execution.alertOnFailure`
- `execution.emitEvents`

子块 C：类型特有配置（按节点类型动态显示）

`sql-agent`
- `typeConfig.instanceRef`
- `typeConfig.jobName`
- `typeConfig.stepName`

`stored-proc`
- `typeConfig.instanceRef`
- `typeConfig.database`
- `typeConfig.procedureName`
- `typeConfig.parameters`

`sql-script`
- `typeConfig.instanceRef`
- `typeConfig.database`
- `typeConfig.scriptRef` 或 `typeConfig.inlineSql`
- `typeConfig.parameters`

`python`
- `typeConfig.hostRef`
- `typeConfig.pythonEnvRef`
- `typeConfig.scriptPath`
- `typeConfig.argsTemplate`
- `typeConfig.workingDirectory`
- `typeConfig.statusReportMode`
- `typeConfig.resultFilePath`（条件显示）
- `typeConfig.parsePartialSuccess`
- `typeConfig.subStepReportEnabled`

`windows-task`
- `typeConfig.hostRef`
- `typeConfig.taskPath`
- `typeConfig.taskName`

###### 3. 失败策略（核心）

子块 A：失败动作

- `failure.onFailureAction`
- `failure.escalateSeverity`（可选）

子块 B：重试策略（条件显示）

- `retry.enabled`
- `retry.maxAttempts`
- `retry.intervalType`
- `retry.baseIntervalSec`
- `retry.maxIntervalSec`（指数退避时显示）
- `retry.retryOnErrorCodes`
- `retry.retryOnErrorTypes`
- `failure.afterRetryExhausted`

子块 C：补偿策略（条件显示）

- `compensation.compensationTargetNodeId`
- `compensation.onCompensationSuccess`
- `compensation.onCompensationFailure`（v1 可只读）

显示规则：

- `onFailureAction=retry` 时展开重试策略
- `onFailureAction=compensate` 时展开补偿策略
- `afterRetryExhausted=compensate` 时也展开补偿策略

###### 4. 变量映射

建议采用两个子区块（或 Tab）：

- 输入映射（`inputMapping`）
- 输出映射（`outputMapping`）

输入映射列建议：

- `targetKey`
- `sourceExpr`
- `defaultValue`
- `required`

输出映射列建议：

- `sourceKey`
- `targetKey`
- `scope`

###### 5. 控制策略（按节点类型）

`condition`
- `condition.expression`
- `condition.onEvaluateError`

`parallel/join`
- `join.joinPolicy`（v1 固定 `all_success`，可只读展示）
- `join.timeoutSec`
- `join.failFast`

`delay`
- `delayValue`
- `delayUnit`

###### 6. 高级设置

- `meta.owner`
- `ui.notes`
- `ui.validationState`（只读）
- `ui.validationErrors[]`（只读）

##### E. 表单状态管理（前端实现建议）

建议维护三层状态：

1. `persistedConfig`：节点当前已保存配置
2. `draftConfig`：面板编辑草稿
3. `validationResult`：即时校验结果

交互规则：

- 字段编辑只更新 `draftConfig`
- 点击 `应用` 后写回节点 `config`
- 校验失败时允许保存草稿，但将节点标记为 `invalid`（利于先搭图后补配置）

##### F. 校验提示策略（v1）

采用“字段级 + 分组级 + 顶部汇总”三级提示：

- 字段级：输入框下错误文案
- 分组级：分组标题显示错误数量
- 顶部汇总：提示“存在 X 个配置错误，无法发布”

即时校验优先项：

- 必填字段
- 数值范围（超时、重试次数、重试间隔）
- 补偿目标缺失（需要时）
- 条件表达式为空（条件节点）

发布前校验仍以 `10.0.9` 为准。

##### G. 底部操作栏（建议）

按钮：

- `应用`
- `重置`
- `删除节点`（危险操作，需二次确认）

交互建议：

- 有未保存改动时 `应用` 高亮
- `重置` 恢复 `persistedConfig`
- 删除成功后自动关闭 NodeInspector

##### H. 与画布联动（v1）

NodeInspector `应用` 后同步更新：

- 节点 label（如果 `displayName` 变化）
- 节点校验状态红点（`ui.validationState=invalid`）
- 节点摘要 tooltip（后续扩展）

##### I. NodeInspector v1 实现优先级

1. 基础信息 + 执行超时 + 失败动作
2. 重试策略（含 `afterRetryExhausted`）
3. 补偿目标选择
4. 条件/汇聚策略展示
5. 变量映射表格
6. 未保存修改提示与底部操作栏

#### 10.0.11 与 RunEvent 的对应关系（关键）

节点配置会直接影响运行期事件产生方式：

- `failure.onFailureAction=skip`
  - 产出 `node_completed_failed` + `node_skipped`
  - 最终可能产出 `run_completed_partial_success`

- `failure.onFailureAction=retry`
  - 失败后产出 `node_retry_scheduled`
  - 重试开始产出 `node_retry_started`
  - 耗尽后产出 `node_retry_exhausted`

- `failure.onFailureAction=compensate`
  - 产出 `node_compensation_started`
  - 成功产出 `node_compensation_success`
  - 失败产出 `node_compensation_failed`

- `join.joinPolicy=all_success`
  - 汇聚时产出 `node_join_evaluated`

#### 10.0.11.A Python 脚本本身是“子工作流”时的状态传递（新增）

> 场景：某个 `python` 节点执行的脚本内部本身包含多阶段流程（例如提取、清洗、校验、落库、通知），需要把内部状态与平台节点/运行状态对齐。

##### 目标

- 平台顶层仍保持统一 `Run/RunEvent` 模型
- 支持从“黑盒接入”逐步升级到“可见子步骤”
- 不强制一次性把 Python 内部流程拆成平台原生工作流

##### 分层方案（推荐）

###### A. 黑盒模式（v1 默认）

平台只把 Python 脚本当作一个执行节点：

- 平台感知：
  - `node_started`
  - `node_completed_success` / `node_completed_failed`
- 不感知脚本内部步骤

状态传递方式：

- 进程退出码（`exitCode`）
- 标准输出/错误输出日志
- 可选结构化结果（stdout 单行 JSON 或结果文件 JSON）

映射建议：

- `exitCode = 0` -> 节点成功
- `exitCode != 0` -> 节点失败
- 若存在结构化结果 JSON，则用于补充 `payload`（指标、错误码、摘要）

###### B. 半托管模式（推荐后续增强）

Python 脚本上报内部子步骤状态，但平台顶层仍视为同一个 `python` 节点。

平台视角：

- 工作流图仍只有 1 个 Python 节点
- `Run详情` 可展示该节点下的“子步骤时间线”

状态传递方式（推荐）：

- 脚本通过 SDK / CLI / stdout 协议上报子步骤事件
- 平台写入 `RunEvent`（先通过 `payload.subStep*` 扩展字段承载）

建议子步骤上报信息：

- `subStepId`
- `subStepName`
- `subStepStatus`（`started | success | failed`）
- `durationMs`
- `errorCode`
- `message`
- `metrics`

###### C. 托管模式（长期目标）

将 Python 内部流程迁移为平台原生 `Workflow` / `subflow`：

- 每一步都是平台节点
- 状态、重试、补偿、告警完全由平台控制

适用场景：

- 关键链路
- 需要可视化审计和版本化治理

##### v1 推荐结论

- 默认采用黑盒模式
- 为关键 Python 流程预留半托管模式字段与上报协议
- 长期逐步迁移为原生工作流/子流程

##### Python 脚本与平台的最小状态契约（建议）

即使使用黑盒模式，也建议脚本尽量输出结构化结果，降低平台误判风险。

1. 退出码契约

- `0`：执行完成（成功或降级完成，需结合结构化结果判断）
- 非 `0`：执行失败

2. 结构化结果（可选但建议）

建议字段：

- `status`：`success | failed | partial_success`
- `errorCode`（失败时）
- `message`
- `metrics`（如 `rowsProcessed`, `filesGenerated`）
- `steps`（可选，内部子步骤摘要）

##### Python 节点结果映射到平台状态（建议）

- 脚本返回 `status=success` 且 `exitCode=0`
  - 节点状态 -> `success`

- 脚本返回 `status=partial_success` 且 `exitCode=0`
  - 节点执行完成（节点可记为 `success`）
  - 在节点事件 `payload` 标记 `degraded=true`
  - 顶层 Run 是否记为 `partial_success` 由工作流聚合规则决定（建议关键节点降级时记 `partial_success`）

- 脚本返回 `status=failed` 或 `exitCode!=0`
  - 节点状态 -> `failed`
  - 后续按节点 `failure/retry/compensation` 策略执行

##### RunEvent 扩展建议（Python 子步骤场景）

v1 不强制新增事件类型，可先在 `payload` 中加入：

- `payload.subStepId`
- `payload.subStepName`
- `payload.subStepStatus`
- `payload.subStepMetrics`

后续若子步骤事件量大，再扩展专用事件类型（如 `node_substep_started/completed`）。

##### 告警规则建议（Python 内部子流程场景）

- 黑盒模式：按节点失败事件告警（`node_completed_failed`）
- 半托管模式：子步骤错误可映射为节点错误码（如 `PY_VALIDATE_FAILED`）
- 默认去重键仍保持：
  - `对象 + 节点 + 错误码`
  - 不建议默认加入 `subStepName`，避免告警过度碎片化

#### 10.0.11.B SQL / 存储过程执行的状态传递（新增）

> 场景：`sql-script` / `stored-proc` / `sql-agent` 节点执行时，需要把数据库执行结果、返回码、受影响行数、业务错误与技术错误准确映射到平台节点状态与 `RunEvent`。

##### 目标

- 对 SQL 类节点建立统一状态回传约定
- 区分“技术失败”和“业务失败/降级完成”
- 为告警规则提供稳定的 `errorCode`
- 保留统计信息（行数、耗时、返回值、输出参数）

##### SQL 类节点分类与状态来源

###### A. `sql-script`

状态来源建议：

- 数据库驱动执行成功/失败（异常）
- 影响行数（`rowsAffected`）
- 可选结果集统计（`resultSets`、`rowCount`）
- 脚本内部约定输出（如最后一行状态表/状态 SELECT）

###### B. `stored-proc`

状态来源建议：

- 调用是否成功（驱动层）
- 存储过程返回码（`returnCode`）
- 输出参数（`outputParams`）
- SQL 错误号（如 SQL Server `error_number`）
- 业务状态输出（如 `@StatusCode`, `@StatusMessage`）

###### C. `sql-agent`

状态来源建议（平台侧通常较间接）：

- Agent Job 执行结果（成功/失败/重试中）
- Step 执行结果与失败 Step 名称
- Agent 返回消息/历史日志摘要
- 最终退出状态

##### 推荐分层方案（与 Python 保持一致）

###### 方案 A：黑盒模式（v1 默认）

平台仅判断节点最终成功/失败：

- 成功：节点 `success`
- 失败：节点 `failed`

可用信息：

- 执行耗时
- 行数（若驱动可得）
- 错误消息字符串

适用场景：

- 快速接入历史 SQL / 存储过程
- 暂未统一数据库返回规范

###### 方案 B：结构化结果模式（推荐 v1.5/v2）

平台在执行器层（Agent/Executor）把数据库结果标准化后回传平台。

建议统一结果对象（概念）：

- `status`: `success | failed | partial_success`
- `errorCode`
- `message`
- `rowsAffected`
- `resultSetCount`
- `returnCode`（存储过程）
- `outputParams`（存储过程）
- `sqlState` / `dbErrorCode`（技术错误）
- `warnings[]`
- `metrics`

说明：

- 结构化结果由执行器生成，不强依赖 SQL 脚本本身改造
- 对存储过程可结合 `returnCode + outputParams` 进行业务状态判定

##### 平台最小状态契约（SQL 类节点）

###### 1. 技术层执行状态（必须）

- `success`: 执行器成功拿到数据库执行完成结果
- `failed`: 驱动异常 / 连接失败 / 超时 / SQL语法错误 / 权限错误

###### 2. 业务层执行状态（建议）

通过返回码或输出参数表达：

- `status = success`
- `status = failed`
- `status = partial_success`

典型场景：

- 存储过程执行完成，但部分记录校验失败并跳过 -> `partial_success`
- SQL 脚本执行成功，但结果集提示业务条件未满足 -> 可映射 `failed` 或 `partial_success`（按规则）

##### SQL / 存储过程结果映射到平台节点状态（建议）

- 技术执行失败（连接超时、语法错误、权限不足）
  - 节点状态 -> `failed`
  - 产出 `node_completed_failed`
  - `errorCode` 使用标准化技术错误码（如 `DB_CONN_TIMEOUT`, `SQL_SYNTAX_ERROR`）

- 技术成功，业务返回 `status=success`
  - 节点状态 -> `success`
  - 产出 `node_completed_success`

- 技术成功，业务返回 `status=partial_success`
  - 节点执行完成（节点可记为 `success`）
  - 在 `payload` 标记 `degraded=true`
  - 顶层 Run 是否记为 `partial_success` 由工作流聚合规则决定

- 技术成功，业务返回 `status=failed`
  - 节点状态 -> `failed`
  - 产出 `node_completed_failed`
  - 后续走节点失败策略（重试/补偿/跳过等）

##### 存储过程专用建议（强烈推荐）

为降低平台误判，建议存储过程建立统一返回约定（至少在关键过程）：

- `RETURN`：返回技术/业务执行码（整型）
- 输出参数（推荐）：
  - `@StatusCode`（业务状态码）
  - `@StatusMessage`（业务摘要）
  - `@RowsProcessed`
  - `@RowsFailed`
  - `@RowsSkipped`

平台映射优先级建议：

1. 驱动异常（最高优先级，直接失败）
2. 输出参数 `@StatusCode`（若存在）
3. `RETURN` 返回码
4. 默认成功（无异常且无状态返回时）

##### `sql-script` 专用建议（可选约定）

若脚本无法方便改造成结构化返回，可约定以下轻量模式之一：

- 约定执行器统计并返回 `rowsAffected`
- 约定脚本末尾 `SELECT` 一行状态摘要（由执行器解析）
- 约定脚本写入状态表（执行器读取，后期可做）

推荐状态摘要字段（若用 `SELECT`）：

- `Status` (`success | failed | partial_success`)
- `ErrorCode`
- `Message`
- `RowsProcessed`
- `RowsFailed`

##### `sql-agent` 专用建议（平台侧标准化）

由于 Agent Job 常由外部调度器执行，建议平台统一抽象以下字段：

- `jobStatus`（success/failed/running）
- `failedStepName`（失败时）
- `stepResults[]`（可选）
- `agentMessage`
- `returnCode`（若可取）

映射建议：

- Agent Job 整体成功 -> 节点 `success`
- Agent Job 失败 -> 节点 `failed`
- 若 Agent 提供步骤级失败信息，写入 `payload.failedStepName` 和 `payload.stepResults`

##### RunEvent payload 建议（SQL 类节点）

`node_completed_success` / `node_completed_failed` 的 `payload` 可统一包含：

- `dbType`（如 `sqlserver`）
- `executionMode`（`sql-script | stored-proc | sql-agent`）
- `durationMs`
- `rowsAffected`
- `rowsProcessed`
- `rowsFailed`
- `rowsSkipped`
- `returnCode`（存储过程/agent 可用）
- `outputParams`（存储过程）
- `dbErrorCode` / `sqlState`（技术错误）
- `failedStepName`（sql-agent）
- `degraded`（布尔）

##### 告警规则建议（SQL 类节点）

- 技术错误优先按标准错误码告警（连接、超时、权限、语法）
- 业务错误按业务状态码告警（如 `SP_BIZ_VALIDATE_FAILED`）
- 去重键仍使用：
  - `对象 + 节点 + 错误码`
- 不建议把 `rowsAffected` 等统计字段纳入去重键

##### 与 retry / partial_success 的协同建议

- 技术错误（连接超时、死锁、瞬时网络）通常适合重试
- 业务错误（参数非法、校验失败）默认不重试
- 可通过 `retry.retryOnErrorCodes` 精细控制
- SQL/存储过程返回 `partial_success` 时，建议默认不立即告警，由规则决定是否对“部分成功连续 N 次”告警

#### 10.0.12 v1 TypeScript 类型草案（原型级）

```ts
type NodeFailureAction =
  | "terminate"
  | "skip"
  | "retry"
  | "compensate"
  | "continue_parallel";

interface WorkflowNodeConfig {
  meta?: {
    displayName?: string;
    description?: string;
    tags?: string[];
    owner?: string;
    enabled?: boolean;
    critical?: boolean;
  };
  binding?: {
    bindingType?: "job_template" | "direct_config" | "none";
    jobId?: string;
    jobVersion?: string;
    resourceRef?: string;
  };
  inputMapping?: {
    mode?: "inherit" | "custom";
    mappings?: Array<{
      targetKey: string;
      sourceExpr: string;
      required?: boolean;
      defaultValue?: unknown;
      transform?: string;
    }>;
  };
  outputMapping?: {
    publishToContext?: boolean;
    mappings?: Array<{
      sourceKey: string;
      targetKey: string;
      scope?: "workflow" | "local";
    }>;
  };
  execution?: {
    timeoutSec?: number;
    alertOnFailure?: boolean;
    emitEvents?: boolean;
  };
  failure?: {
    onFailureAction?: NodeFailureAction;
    afterRetryExhausted?: Exclude<NodeFailureAction, "retry">;
    escalateSeverity?: "warning" | "error" | "critical";
  };
  retry?: {
    enabled?: boolean;
    maxAttempts?: number; // 不含首次
    intervalType?: "fixed" | "exponential";
    baseIntervalSec?: number;
    maxIntervalSec?: number;
    retryOnErrorCodes?: string[];
    retryOnErrorTypes?: string[];
  };
  compensation?: {
    mode?: "none" | "node";
    compensationTargetNodeId?: string;
    triggerCondition?: "on_failure" | "after_retry_exhausted";
    onCompensationSuccess?: "continue" | "end_partial_success";
    onCompensationFailure?: "terminate";
  };
  join?: {
    joinPolicy?: "all_success";
    timeoutSec?: number;
    failFast?: boolean;
  };
  condition?: {
    expression?: string;
    engine?: "simple_expr";
    onEvaluateError?: "terminate" | "skip";
  };
  typeConfig?: Record<string, unknown>;
  ui?: {
    validationState?: "unknown" | "valid" | "invalid";
    validationErrors?: string[];
    notes?: string;
  };
}
```

### 10.1 retry 策略模型（节点级）

建议拆分为：

- `retryPolicy`
  - `enabled`
  - `maxAttempts`（已确认：不含首次执行）
  - `intervalType`（`fixed | exponential`）
  - `baseIntervalSec`
  - `maxIntervalSec`
  - `jitter`（后期）
  - `retryOn`
- `afterRetryExhausted`
  - `terminate | skip | compensate | continue_parallel`

推荐默认值（原型）：

- `maxAttempts = 3`
- `intervalType = fixed`
- `baseIntervalSec = 300`
- `afterRetryExhausted = terminate`

### 10.2 compensation 建模方式（分阶段）

v1 原型（推荐）：

- 使用 `compensationTargetNodeId` 指向补偿节点
- 补偿节点可标记 `mode = compensation`

v2 扩展（预留）：

- `compensationWorkflowId`（独立补偿子流程）

### 10.3 manual trigger 手动触发面板（v1）

目标：

- 作为 `Job` / `Workflow` 统一触发入口
- 触发后创建统一 `Run`

建议字段：

- 对象信息（只读）
- 参数输入（支持默认值回填与必填校验）
- `dryRun`（已确认：v1 展示）
- 触发说明 `comment`

标准行为：

- 创建 `Run`
- 跳转 `Run详情`
- 若 `dryRun = true`，Run 标记为演练/校验执行（具体字段可后续补）

#### 10.3.1 适用入口（建议统一）

以下页面中的“运行一次/重跑/测试触发”应尽量复用同一弹窗组件：

- `Job详情`（运行一次）
- `Workflow详情`（运行一次）
- `Job列表`（行内运行）
- `Workflow列表`（卡片运行）
- `Run详情`（重跑，可复用并默认带入上次参数）
- `Trigger详情`（Webhook 测试触发，后续可接入）

#### 10.3.2 弹窗目标（v1）

- 统一 `Job` / `Workflow` 的人工触发入口
- 统一参数输入、校验、审计说明与触发行为
- 统一生成 `Run` 与 `RunEvent`
- 为后续扩展权限控制、优先级、抑制告警等选项预留位置

#### 10.3.3 弹窗结构（信息架构）

建议分为 4 个区域（单弹窗，滚动内容）：

1. 顶部摘要区（对象与触发上下文）
2. 参数区（运行参数输入）
3. 执行选项区（如 `dryRun`）
4. 提交区（校验提示 + 提交按钮）

#### 10.3.4 字段设计（v1）

##### A. 顶部摘要区（只读）

- `对象类型`：`Job | Workflow`
- `对象名称`
- `对象ID`（可折叠显示）
- `触发类型`：固定为 `manual`
- `说明`（如“将创建新的 Run 实例”）

##### B. 参数区（可编辑）

参数来源建议：

- `Workflow`：来自工作流参数定义（`WorkflowDetail.params` / 编辑器参数定义）
- `Job`：来自作业定义（v1 可先用 key/value 空表单）

参数字段建议结构：

- `name`
- `label`
- `type`（`string | number | boolean | date | datetime | select | json`）
- `required`
- `defaultValue`
- `description`
- `placeholder`
- `options`（`select` 用）
- `validation`（正则/范围/枚举，v1 可简化）
- `sensitive`（是否敏感字段，后续可用于脱敏显示）

v1 交互要求：

- 支持新增/删除参数行（至少对 Job 支持）
- 支持必填校验
- 支持显示默认值与重置
- 参数名冲突校验（key 唯一）

##### C. 执行选项区（v1）

- `dryRun`（checkbox，已确认展示）
  - 含义：仅校验参数与流程结构，不执行实际动作（原型阶段可模拟）
- `comment`（文本输入/文本域）
  - 含义：本次触发说明，用于审计与排障（如“月结补跑”“验证修复”）

##### D. 提交区（状态与动作）

- 参数校验结果提示（成功/失败）
- 主按钮：`开始运行`
- 次按钮：`取消`
- 可选按钮（后续）：`仅校验`

#### 10.3.5 默认值与参数回填规则（建议）

首次打开弹窗：

- 优先使用对象定义的 `defaultValue`
- 无默认值则为空

从 `Run详情` 重跑打开弹窗时：

- 优先带入上次 `Run.params`
- 若对象定义已变化：
  - 保留已有同名参数值
  - 新参数使用默认值
  - 已删除参数标记为“历史参数（未使用）”并默认不提交（v1 可省略该 UI，仅丢弃）

#### 10.3.6 校验规则（v1）

提交前前端校验：

- 必填参数不能为空
- `number` 参数必须可解析
- `json` 参数必须可解析（若支持）
- 参数 key 不重复
- `comment` 长度限制（建议 200~500 字）

对象状态校验（可由前端 mock 模拟）：

- 对象存在且启用
- 若为 `Workflow`：至少有可发布/可执行版本（v1 可用 mock 布尔值）
- 若为 `dryRun`：允许在对象禁用时仍执行校验（建议允许，后续再定）

#### 10.3.7 提交行为（统一动作）

点击 `开始运行` 后建议执行以下流程：

1. 前端校验参数与表单
2. 生成触发请求快照（用于审计）
3. 创建新 `Run`（`triggerType = manual`）
4. 创建初始 `RunEvent`：
   - `run_created`
   - `run_started`（若非队列模式）
5. 跳转 `Run详情`

若 `dryRun = true`：

- `Run` 可增加字段 `isDryRun = true`
- 时间线事件建议带 tag：`["dry-run"]`
- 最终状态由模拟校验结果决定（`success | failed`）

#### 10.3.8 与 Run / RunEvent / Alert 的关系

手动触发本身的事件建议（v1）：

- `run_created`
- `run_started`
- 后续节点事件（执行过程中）
- `run_completed_*`

说明：

- 手动触发不需要单独新增 `manual_trigger_requested` 事件（v1 可省略）
- 若后续需要审计增强，可追加 `trigger_received/trigger_validated` 的 manual 版本或单独事件类型

#### 10.3.9 权限与风控（先占位，后实现）

v1 原型可只展示，不实现鉴权逻辑。建议文档先明确后续扩展点：

- 仅具备 `Operator/Developer/Admin` 角色可手动触发
- `dryRun` 与真实执行可配置不同权限
- 特定对象可禁用手动触发
- 高频重复手动触发限流（后期）

#### 10.3.10 UI 状态（前端实现建议）

弹窗状态建议：

- `idle`
- `validating`
- `submitting`
- `submit_failed`

交互细节建议：

- `submitting` 时禁用表单与按钮，避免重复提交
- 提交失败时保留用户输入
- `dryRun` 开启时显示提示条（如“本次不会执行真实任务，仅进行校验/模拟运行”）

#### 10.3.11 建议新增前端组件（原型）

建议新增共用组件（命名可调整）：

- `src/app/components/RunTriggerDialog.tsx`

建议 Props（原型级）：

- `open`
- `onOpenChange`
- `targetType` (`job | workflow`)
- `targetId`
- `targetName`
- `parameterSchema`
- `initialParams`
- `mode` (`run | rerun`)
- `onSubmit`

#### 10.3.12 v1 示例（工作流手动触发）

示例输入：

- 对象：`Workflow / 财务月结流程`
- 参数：
  - `DATE = 2026-02-26`
  - `NOTIFY_EMAIL = finance@company.com`
- `dryRun = false`
- `comment = 月结补跑，验证成本修复`

预期结果：

- 新建 `Run`（`objectType=workflow`, `triggerType=manual`）
- 时间线产出 `run_created`、`run_started`
- 页面跳转至 `Run详情`

#### 10.3.13 v1 示例（从 Run 重跑）

示例输入：

- 模式：`rerun`
- 参数默认带入上次 `Run.params`
- `dryRun = true`
- `comment = 失败后参数校验演练`

预期结果：

- 新建 `Run`（不复用原 Run）
- `parentRunId = 上次RunID`
- `rootRunId = 原链路rootRunId`
- `isDryRun = true`

#### 10.3.14 RunTriggerDialog 表单布局与交互状态机细化（v1.7）

> 目标：将 `manual trigger` 抽象为可复用的前端弹窗组件规范，统一 `Job/Workflow` 手动触发、`Run` 重跑和（后续）Trigger 测试触发的交互行为。

##### A. 组件定位与使用场景

统一组件建议名称：

- `RunTriggerDialog`

复用场景（v1/v1.5）：

- `JobDetail`：运行一次
- `WorkflowDetail`：运行一次
- `JobsList`：行内运行
- `WorkflowsList`：卡片运行
- `RunDetail`：重跑（带入上次参数）
- （后续）`TriggerDetail`：测试触发

##### B. 组件 Props（原型级建议）

```ts
interface RunTriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: "run" | "rerun";
  target: {
    objectType: "job" | "workflow";
    objectId: string;
    objectName: string;
  };

  parameterSchema?: TriggerParameterSchemaItem[];
  initialParams?: Record<string, unknown>;
  initialComment?: string;
  defaultDryRun?: boolean;

  // 可选：用于重跑链路
  parentRunId?: string;
  rootRunId?: string;

  onSubmit: (payload: RunTriggerSubmitPayload) => Promise<RunTriggerSubmitResult> | RunTriggerSubmitResult;
}
```

建议补充类型（原型级）：

```ts
interface TriggerParameterSchemaItem {
  name: string;
  label?: string;
  type: "string" | "number" | "boolean" | "date" | "datetime" | "select" | "json";
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  sensitive?: boolean;
}

interface RunTriggerSubmitPayload {
  mode: "run" | "rerun";
  objectType: "job" | "workflow";
  objectId: string;
  params: Record<string, unknown>;
  dryRun: boolean;
  comment?: string;
  parentRunId?: string;
  rootRunId?: string;
}

interface RunTriggerSubmitResult {
  ok: boolean;
  runId?: string;
  errorMessage?: string;
  fieldErrors?: Record<string, string>;
}
```

##### C. 弹窗布局（v1）

建议结构（单弹窗，滚动内容）：

1. 顶部区域（固定）
- 标题：`手动触发运行` / `重跑运行`
- 副标题：对象类型 + 对象名称
- 关闭按钮

2. 主体区域（滚动）
- `对象摘要卡`
- `运行参数` 区
- `执行选项` 区
- `校验与提示` 区

3. 底部操作栏（固定）
- `取消`
- `开始运行`（主按钮）

##### D. 分区字段布局细化

###### 1. 对象摘要卡（只读）

建议字段：

- `对象类型`（Job / Workflow）
- `对象名称`
- `对象ID`（可折叠）
- `触发类型`（固定 `manual`）
- 若 `mode=rerun`：
  - `来源 Run ID`
  - `rootRunId`

###### 2. 运行参数区（核心）

布局模式建议：

- 有 `parameterSchema`：按 schema 渲染表单项
- 无 `parameterSchema`：降级为 key/value 编辑表（适合 Job v1）

字段渲染规则：

- `string`：输入框
- `number`：数字输入框
- `boolean`：开关/checkbox
- `date` / `datetime`：日期时间输入（v1 可先文本输入 + placeholder）
- `select`：下拉
- `json`：文本域 + JSON 校验

交互细节：

- 必填项标记 `*`
- 有默认值时显示“恢复默认”按钮（可选）
- `sensitive=true` 字段默认遮罩（v1 可先普通输入）
- `description` 在字段下方作为说明文本

###### 3. 执行选项区

字段：

- `dryRun`（checkbox）
- `comment`（文本域，建议 2-4 行）

提示规则：

- `dryRun=true` 时显示蓝色提示条：
  - “本次仅进行校验/模拟运行，不执行真实任务（原型阶段可模拟）”
- `mode=rerun` 时显示说明：
  - “已自动带入上次运行参数，可修改后重跑”

###### 4. 校验与提示区

显示内容（按状态）：

- 表单校验错误汇总（字段错误列表）
- 系统校验提示（对象禁用、无可执行版本等）
- 提交失败提示（服务端/模拟错误）

建议优先展示规则：

1. 字段错误
2. 对象不可执行错误
3. 提交失败错误

##### E. 状态机（前端交互）

建议状态枚举：

- `idle`：初始/可编辑
- `editing`：用户编辑中（可选，通常可并入 idle）
- `validating`：前端校验中
- `submitting`：提交中
- `submit_failed`：提交失败（可继续编辑）
- `submit_success`：提交成功（短暂态，随后关闭并跳转）

推荐状态流转：

1. 打开弹窗
- `open=false -> open=true`
- 初始化表单值（schema 默认值或重跑参数）
- 状态进入 `idle`

2. 用户编辑
- 任意字段变更 -> 保持 `idle`
- 清除对应字段错误

3. 点击 `开始运行`
- `idle -> validating`
- 前端校验通过 -> `submitting`
- 校验失败 -> `idle`（展示错误）

4. 提交结果
- 成功：`submitting -> submit_success` -> 关闭弹窗 -> 跳转 `RunDetail`
- 失败：`submitting -> submit_failed` -> 展示错误 -> 回到 `idle`

##### F. 校验规则（RunTriggerDialog v1）

字段校验：

- 必填参数不能为空
- `number` 类型可解析
- `json` 类型必须可解析
- 参数名唯一（key/value 模式）
- `comment` 长度限制（建议 <= 500）

对象校验（前端 mock / 接口返回）：

- 对象存在
- 对象已启用（`dryRun` 场景可放宽）
- `workflow` 有可执行版本（非草稿）

模式校验：

- `mode=rerun` 时若传入 `parentRunId`，建议同时传 `rootRunId`（缺失可自动回退）

##### G. 提交行为细化（与数据模型联动）

提交成功后的标准动作：

1. 生成/返回新 `Run`
- `triggerType = manual`
- `mode=rerun` 时：
  - `parentRunId = 来源RunID`
  - `rootRunId = 来源rootRunId（或来源RunID）`

2. 生成初始事件（至少）
- `run_created`
- `run_started`（若不经过显式队列）

3. 前端行为
- 关闭弹窗
- 跳转 `RunDetail(runId)`

若 `dryRun=true`：

- `Run` 增加 `isDryRun=true`（建议）
- `RunEvent.tags` 可含 `dry-run`
- 运行结果可由 mock 执行器决定 `success/failed`

##### H. 错误处理与用户体验（建议）

提交失败类型建议区分：

1. 字段级错误（如参数不合法）
- 返回 `fieldErrors`
- 高亮对应字段

2. 对象级错误（如对象已禁用/不存在）
- 在校验与提示区显示
- 禁止继续提交（直到刷新或关闭）

3. 系统错误（如创建 Run 失败）
- 顶部/底部错误提示
- 保留用户输入，允许重试

按钮状态建议：

- `submitting` 时禁用所有输入与按钮
- 主按钮文案切换为：`提交中...`

##### I. 与页面联动（v1）

###### `JobDetail` / `WorkflowDetail`

- “运行一次”按钮改为打开 `RunTriggerDialog`
- 弹窗提交后跳转新 `RunDetail`

###### `RunDetail`

- “重跑”按钮打开 `RunTriggerDialog(mode=rerun)`
- 自动带入上次 `params`
- 自动传入 `parentRunId/rootRunId`

###### `Dashboard`（后续）

- 实时队列中“重跑”按钮复用同一弹窗

##### J. v1 原型实现优先级（RunTriggerDialog）

1. 基础弹窗 + 对象摘要 + `dryRun/comment`
2. Schema 表单渲染（string/number/select/json）
3. 前端校验 + 提交状态机
4. `mode=rerun` 参数回填
5. 与 `RunDetail` 跳转联动
6. 错误分类展示（field/system）

### 10.4 partial_success 展示规范（已确认口径）

状态展示：

- `partial_success` 为正式状态标签（建议橙色）

KPI 口径：

- 仪表盘默认展示“严格成功率”
- `Success` 仅统计 `success`
- `Partial Success` 单独统计
- `Failure` 统计 `failed`

可选后续指标（预留）：

- 业务完成率 = `(success + partial_success) / total`

## 11. 原型页面级改造清单（当前讨论版）

> 本节用于指导后续原型落地，不等于一次性全部实现。建议按优先级推进。

### 11.1 优先级路线

1. `Workflow 编辑器`（节点失败策略/重试/补偿/汇聚）
2. `Run 列表 + Run 详情`（统一状态与事件时间线）
3. `手动触发弹窗`（Job/Workflow 共用）
4. `告警中心 + 告警规则`（事件规则、去重聚合）
5. `仪表盘`（partial_success 口径）
6. `作业/工作流详情`（联动与跳转）

### 11.2 页面改造要点（摘要）

#### `WorkflowEditor` / `NodeInspector`

- 节点属性支持失败策略、重试策略、重试耗尽后动作、补偿目标、失败告警
- 汇聚节点支持 `joinPolicy`（默认 `all_success`）
- 发布前结构化校验（替代 alert）

#### `RunsList` / `RunDetail`

- 支持 `partial_success`
- 时间线展示 retry/skip/compensation/join 事件
- 顶部摘要体现最终状态原因（如补偿成功、降级完成）

#### 手动触发弹窗（建议新增共用组件）

- 统一 Job/Workflow 触发入口
- 参数输入 + `dryRun` + comment
- 触发后创建 Run 并跳转详情
- 建议组件：`RunTriggerDialog`

#### `AlertsList` / `AlertRules`

- 告警规则体现“事件采集 + 规则判定”
- 告警列表增加事件类型、错误码、节点、聚合次数、首次/最近发生
- 去重键按 `对象+节点+错误码`

#### `Dashboard`

- 增加 `Partial Success` KPI
- 默认成功率为严格成功率
- 趋势图后续支持第三类状态（橙色）

#### `Settings`

- 移除环境配置相关内容（Prod/Pre/Dev）
- 替换为运行默认策略/日志保留/告警默认配置等更有价值内容（后续细化）

## 11.A RunDetail 页面设计细化（v1.8）

> 目标：将统一 `Run` 模型与 `RunEvent` 事件模型落地到 `RunDetail` 页面，形成可解释、可追踪、可联动的执行详情视图。

### 11.A.1 页面目标与核心问题

`RunDetail` 需要回答 4 个问题：

1. 这次运行最终结果是什么（`success / failed / partial_success / cancelled`）？
2. 哪个节点出问题、是否发生重试/补偿/跳过？
3. 运行过程按时间发生了什么？
4. 我可以从这里执行什么操作（重跑/终止/跳转对象/跳转告警）？

### 11.A.2 页面布局（建议）

建议保留当前三段式结构并增强信息密度：

1. 顶部摘要区（Header + 操作）
2. 运行概览卡（Summary）
3. 内容区 Tab（时间线 / 流程回放 / 日志）

可选后续扩展：

4. 关联信息侧栏（告警、参数快照、上下文快照）

### 11.A.3 顶部摘要区（Header）

建议字段：

- 标题：`Run {runId}`
- 副标题：`{objectName} · {triggerType}`
- 状态标签（重点）
- 对象跳转入口（`JobDetail` / `WorkflowDetail`）

操作按钮（按状态显示）：

- `重跑`（所有已结束状态可用）
- `终止`（`running / queued` 可用）
- `查看关联告警`（有告警时显示）

状态标签颜色建议：

- `success`：绿色
- `failed`：红色
- `partial_success`：橙色
- `running`：蓝色（带动态点）
- `queued`：黄色
- `cancelled`：灰色

### 11.A.4 运行概览卡（Summary）

建议字段（v1）

基础字段：

- `status`
- `startTime`
- `endTime`
- `durationMs`（格式化显示）
- `objectType`
- `triggerType`
- `initiator`

追踪字段：

- `parentRunId`（重跑来源）
- `rootRunId`（链路根）
- `failedNodeId`（失败/部分成功时）
- `errorCode`（若有）
- `errorSummary`

扩展字段（建议逐步增加）：

- `isDryRun`
- `queueWaitMs`
- `retryCountTotal`（节点级重试汇总）
- `compensationCount`

显示建议：

- 对于 `partial_success`，增加一条醒目摘要：
  - “本次运行以降级方式完成（部分成功）”
- 对于 `failed`，突出 `failedNodeId + errorCode`

### 11.A.5 Tab 结构（v1）

建议保留 3 个主 Tab：

1. `执行时间线`（基于 `RunEvent`）
2. `流程回放`（节点视图/流程图回放）
3. `日志`（原始日志 + 错误摘要）

后续可扩展：

4. `参数与上下文`
5. `关联告警`

### 11.A.6 执行时间线（核心）

#### A. 数据来源

- `runEventsByRunId[runId]`
- 按 `sequence` 排序（主排序）
- `time` 作为展示与兜底排序字段

#### B. 时间线项结构（建议）

每条时间线项展示：

- 时间（`time`）
- 图标（按 `eventType` / `severity`）
- 标题（`message` 或事件映射文案）
- 副信息（节点名、耗时、错误码、重试次数等）
- 可展开详情（`payload` 关键字段）

#### C. 事件映射规则（v1 常用）

建议建立前端映射表：`RunEventType -> TimelineRendererConfig`

典型映射（示例）：

- `run_created`
  - 标题：运行实例已创建
  - 图标：文档/圆点

- `run_started`
  - 标题：运行开始
  - 图标：播放

- `node_started`
  - 标题：节点开始执行
  - 副信息：节点名

- `node_completed_success`
  - 标题：节点执行成功
  - 副信息：节点名 + 耗时
  - 详情：`rowsAffected/returnCode/metrics`

- `node_completed_failed`
  - 标题：节点执行失败
  - 副信息：节点名 + `errorCode`
  - 详情：`failureAction`, `errorMessage`

- `node_retry_scheduled`
  - 标题：已计划重试
  - 副信息：第 N 次重试 / 间隔 X 秒

- `node_retry_started`
  - 标题：开始重试

- `node_retry_exhausted`
  - 标题：重试耗尽
  - 副信息：后续动作（终止/补偿/跳过）

- `node_skipped`
  - 标题：节点已跳过
  - 副信息：失败后继续流程

- `node_compensation_started`
  - 标题：开始执行补偿节点
  - 副信息：来源节点 -> 补偿节点

- `node_compensation_success`
  - 标题：补偿执行成功
  - 副信息：将影响最终结果为 `partial_success`（若 `payload.finalRunImpact=partial_success`）

- `node_compensation_failed`
  - 标题：补偿执行失败
  - 副信息：运行将失败

- `node_join_evaluated`
  - 标题：汇聚判定完成
  - 副信息：`joinPolicy` + `result(pass/fail)`

- `run_completed_success`
  - 标题：运行成功完成

- `run_completed_partial_success`
  - 标题：运行部分成功完成
  - 副信息：降级完成/补偿成功

- `run_completed_failed`
  - 标题：运行失败结束
  - 副信息：失败节点 + 错误码

#### D. 时间线筛选（v1.5 可做，v1 可先预留）

建议预留筛选项：

- 全部
- 仅错误/告警候选事件
- 仅节点事件
- 仅重试/补偿事件

#### E. 时间线展开详情（payload 渲染）

v1 建议“结构化摘要 + 原始 JSON 折叠”双模式：

- 摘要模式（优先展示常见字段）
  - `durationMs`
  - `errorCode`
  - `rowsAffected`
  - `returnCode`
  - `joinPolicy`
  - `branchSuccess/Failed`
- 原始模式（折叠面板显示 JSON）

### 11.A.7 流程回放（Diagram）

#### A. 目标

- 在工作流图视角展示本次运行时各节点状态
- 支持快速识别失败、跳过、补偿、未执行节点

#### B. 节点状态映射（建议）

运行回放中的节点状态可从 `RunEvent` 归纳得到：

- `success`
- `failed`
- `skipped`
- `compensated`（补偿节点成功）
- `running`（仅运行中 Run）
- `not_executed`

归纳逻辑（v1）：

- 出现 `node_completed_success` -> `success`
- 出现 `node_completed_failed` 且后续无成功 -> `failed`
- 出现 `node_skipped` -> `skipped`
- 补偿节点出现 `node_compensation_success` -> `compensated`

#### C. 展示建议（v1）

- 复用 `WorkflowCanvas` 的节点渲染风格，但无需完整编辑能力
- 点击节点可展示该节点对应的事件列表（过滤后的时间线）
- 顶部增加图例（成功/失败/跳过/补偿/未执行）

### 11.A.8 日志视图（Logs）

#### A. 日志模式（建议）

保留当前 3 个模式并与事件模型关联：

1. `全量日志`
2. `错误摘要`
3. `结构化日志`

#### B. 全量日志

- 原始 stdout/stderr 或执行器日志
- 保持时间顺序
- 支持简单关键字搜索（v1 可后续）

#### C. 错误摘要

优先从 `RunEvent` 过滤生成，而不是纯文本 grep：

- 筛出 `severity in [error, critical]` 或 `isAlertCandidate=true` 且有 `errorCode`
- 按时间显示：
  - 时间
  - 节点
  - `errorCode`
  - `message`

#### D. 结构化日志

显示结构化 `RunEvent`（可按表格/JSON 列表）

建议列：

- `sequence`
- `time`
- `eventType`
- `nodeName`
- `status`
- `severity`
- `errorCode`

说明：

- 结构化日志与执行时间线共享同一数据源，只是展示形式不同

### 11.A.9 `partial_success` 页面展示规则（落地）

当 `Run.status = partial_success` 时：

顶部摘要：

- 橙色状态标签：`部分成功`
- 显示说明：本次运行通过跳过/补偿等方式降级完成

时间线：

- 必须至少出现以下事件之一（用于解释结果）：
  - `node_skipped`
  - `node_compensation_success`
  - `run_completed_partial_success`

流程回放：

- 失败节点与补偿节点状态同时可见

日志：

- 错误摘要中保留导致降级的失败事件，不因最终 `partial_success` 而隐藏

### 11.A.10 与 `Alert` 的联动（建议）

若存在关联告警（通过 `runId` 或 `sourceEventIds` 间接关联）：

- 顶部显示“关联告警”入口（数量）
- 点击后打开侧边抽屉/弹窗，显示：
  - 告警状态
  - 规则名称
  - 聚合次数
  - 处理人
  - 快速操作（确认/指派/静默/解决）

v1 可先实现：

- 仅展示关联告警列表（只读）

### 11.A.11 页面状态与空态（前端实现建议）

状态建议：

- `loading`
- `loaded`
- `error`
- `not_found`

空态场景：

- `Run` 存在但暂无事件（刚创建）
  - 展示“运行已创建，等待事件上报”
- 日志为空
  - 展示“暂无日志输出”

错误态：

- `runId` 不存在或加载失败
- 提供返回 `RunsList` 的按钮

### 11.A.12 v1 原型实现优先级（RunDetail）

1. 顶部摘要区（支持 `partial_success` 标签）
2. 时间线视图（基于 `RunEvent` 的最小事件集）
3. 日志视图中的“错误摘要/结构化日志”
4. 流程回放节点状态着色（简化版）
5. 重跑按钮联动 `RunTriggerDialog(mode=rerun)`
6. 关联告警入口（只读）

## 11.B AlertsList 与告警详情抽屉设计细化（v1.9）

> 目标：将 `Alert` 聚合结果、`AlertRule` 规则来源和 `RunEvent` 事件证据在告警中心页面形成可处理闭环，支撑“发现 -> 确认 -> 指派 -> 处理 -> 解决”。

### 11.B.1 页面目标与核心问题

`AlertsList` 需要回答：

1. 当前有哪些未处理告警？优先级如何？
2. 告警来自哪条规则、哪个对象、哪个节点、什么错误码？
3. 这是单次异常还是聚合重复异常（`count`）？
4. 我可以在这里执行哪些处理动作？

### 11.B.2 页面结构（建议）

建议结构：

1. 顶部栏（标题 + 规则页入口）
2. 筛选区（搜索、状态/级别/类型筛选）
3. 列表区（聚合告警列表）
4. 详情抽屉（点击行打开，右侧）

说明：

- v1 推荐“列表 + 详情抽屉”而不是跳转详情页，便于运营高频处理
- 保留跳转入口到 `RunDetail` / `WorkflowDetail` / `JobDetail`

### 11.B.3 列表数据模型（页面视角）

列表项建议直接基于 `Alert` 实体渲染，并适度补充计算字段：

- `alertId`
- `status`
- `severity`
- `summary`
- `ruleId` / `ruleName`
- `objectType` / `objectName`
- `nodeId` / `nodeName`
- `errorCode`
- `count`（聚合次数）
- `firstSeen`
- `lastSeen`
- `assignee`
- `latestRunId`
- `dedupKey`

### 11.B.4 列表字段与列布局建议（v1）

建议列（从左到右）：

1. 时间列（`lastSeen`，次行显示 `firstSeen`）
2. 级别列（`severity` 标签）
3. 状态列（`status` 标签）
4. 对象列（`objectName`，次行 `objectType / nodeName`）
5. 规则列（`ruleName`，次行 `errorCode`）
6. 摘要列（`summary`）
7. 聚合列（`count`，可 hover 显示 `dedupKey`）
8. 处理人列（`assignee`）
9. 操作列（`确认 / 指派 / 静默 / 解决 / 详情`）

说明：

- v1 若列表过宽，可合并“规则列 + 摘要列”
- 点击行或“详情”按钮打开抽屉

### 11.B.5 筛选与搜索（v1）

搜索建议匹配字段：

- `summary`
- `objectName`
- `nodeName`
- `errorCode`
- `ruleName`
- `alertId`

筛选项建议：

- `severity`（全部 / warning / error / critical）
- `status`（全部 / open / acknowledged / in_progress / resolved / muted）
- `objectType`（全部 / workflow / job）
- `rule`（可选）

### 11.B.6 告警详情抽屉（右侧）

抽屉结构建议：

1. 顶部摘要区（`summary` + `severity` + `status` + 快捷动作）
2. 基本信息区（`alertId / ruleName / dedupKey / count / firstSeen / lastSeen / assignee`）
3. 对象与运行区（`objectName / nodeName / errorCode / latestRunId` + 跳转入口）
4. 事件证据区（`sourceEventIds` + 最近命中事件摘要 + payload 摘要）
5. 处理记录区（v1 可简化）
6. 备注区（可选）

事件证据区优先展示字段（来自 `RunEvent`）：

- `time`
- `eventType`
- `nodeName`
- `errorCode`
- `message`
- `payload.failureAction`
- `payload.afterRetryExhausted`
- `payload.dbErrorCode / rawErrorCode`

### 11.B.7 告警操作流（状态机）

告警状态：

- `open`
- `acknowledged`
- `in_progress`
- `resolved`
- `muted`

v1 允许动作：

- `确认（acknowledge）`：`open -> acknowledged`
- `指派（assign）`：`open / acknowledged / in_progress`（状态默认不变）
- `开始处理（start processing，可选）`：`acknowledged -> in_progress`
- `静默（mute）`：`open / acknowledged / in_progress -> muted`
- `解决（resolve）`：`open / acknowledged / in_progress / muted -> resolved`

### 11.B.8 操作交互细节（v1）

`确认`
- 点击即执行，成功后状态更新为 `acknowledged`

`指派`
- 小弹窗/下拉选择用户（v1 可不要求备注）

`静默`
- v1 点击即静默（无时长）
- 同键事件建议继续累计 `count`，但不通知

`解决`
- 建议二次确认；备注可后续实现

### 11.B.9 与 `AlertRule` / `RunEvent` / `RunDetail` 的联动（落地）

- 展示并跳转 `AlertRule`
- 抽屉展示 `sourceEventIds` 与最近命中事件摘要
- 提供 `latestRunId` 跳转 `RunDetail`
- 可选展示对象跳转（`WorkflowDetail` / `JobDetail`）

### 11.B.10 前端状态管理建议（v1）

建议拆分状态：

- `filtersState`
- `alertsListState`
- `selectedAlertId`
- `alertDrawerState`
- `actionSubmittingState`（按 `alertId + action`）

### 11.B.11 空态 / 异常态（v1）

空态：

- 无告警：展示“暂无告警”与“查看规则配置”入口
- 筛选后无结果：展示“无匹配结果”，提供“清空筛选”

异常态：

- 列表加载失败
- 操作失败（确认/指派/静默/解决）

建议：操作失败时保留抽屉打开状态，并允许重试。

### 11.B.12 v1 原型实现优先级（Alerts）

1. 列表字段补全（状态/规则/错误码/聚合次数/处理人）
2. 详情抽屉（基本信息 + 对象/运行 + 事件证据摘要）
3. 四个操作按钮（确认/指派/静默/解决）与状态流转
4. 与 `RunDetail` / `AlertRules` 跳转联动
5. 处理记录与备注（后续）

## 11.C WorkflowCanvas 画布交互细化（v2.0）

> 目标：为 `WorkflowEditor` 中的 `WorkflowCanvas` 定义可实现的核心交互规范，使“拖拽编排 -> 连线 -> 配置 -> 校验 -> 发布”形成稳定编辑闭环。

### 11.C.1 画布目标与交互范围

`WorkflowCanvas` 在 v2.0 需要承担：

1. 节点摆放（拖拽/移动）
2. 连线创建与删除
3. 节点/连线选择与删除
4. 缩放与基础视图控制
5. 基础吸附与对齐辅助
6. 校验反馈可视化（节点 invalid 红点 / 连线错误提示）

### 11.C.2 画布数据模型（页面实现视角）

建议在 `WorkflowEditor` 层维护：

- `nodes: WorkflowNode[]`
- `edges: WorkflowEdge[]`
- `selectedNodeId: string | null`
- `selectedEdgeId: string | null`
- `canvasViewState`
- `canvasUiState`

建议新增类型（原型级）：

```ts
interface CanvasViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
  snapToGrid: boolean;
  gridSize: number;
}

interface CanvasUiState {
  mode: "select" | "connect" | "pan";
  connectingFromNodeId?: string | null;
  connectingFromHandle?: "out" | "success" | "failed" | null;
  hoverNodeId?: string | null;
}
```

### 11.C.3 交互模式（Mode）

- `select`（默认）：选中节点/连线、移动节点、Delete 删除
- `connect`：从节点输出端创建连线
- `pan`（后续）：拖动画布视图

### 11.C.4 节点交互（Nodes）

节点选择：

- 单击节点 -> 选中节点并刷新 `NodeInspector`
- 单击空白 -> 取消选中（Inspector 进入空态）

节点移动：

- 拖拽过程中实时更新位置与连线端点
- 放手后写回 `nodes[]`

节点删除：

- `Delete/Backspace` 或 `NodeInspector` 删除按钮
- 删除节点时同时删除关联边

### 11.C.5 连线交互（Edges）

连线创建（v2.0 核心）：

1. 从节点输出端拖拽
2. 显示临时预览线
3. 悬停目标节点高亮
4. 释放到合法目标 -> 创建连线
5. 释放空白 -> 取消

`WorkflowEdge` 建议扩展：

```ts
interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  condition?: string;
  label?: string;
  isValid?: boolean;
  validationErrors?: string[];
}
```

连线创建合法性校验（最小集）：

- 禁止自连
- 禁止重复边（同 `from + to + condition`）
- `end` 节点不能作为来源
- 条件节点同一出口仅允许一条（v2.0 建议）

连线选择与删除：

- 单击连线选中
- `Delete` 删除
- v2.0 不必实现独立 `EdgeInspector`

### 11.C.6 吸附、对齐与网格（v2.0）

网格吸附建议默认开启：

- `snapToGrid = true`
- `gridSize = 20`

规则：

- 拖拽结束时吸附到最近网格点（落点吸附）

对齐辅助线可作为 v2.1 增强项。

### 11.C.7 视图控制（缩放/适配）

缩放范围建议：

- 最小 `0.5`
- 默认 `1.0`
- 最大 `2.0`

交互：

- `+ / -`
- `重置（100%）`
- `Fit to Content`（建议 v2.0 增加）

### 11.C.8 校验反馈可视化（画布侧）

节点级反馈：

- `ui.validationState = invalid` -> 节点红点

连线级反馈（建议新增）：

- `edge.isValid = false` -> 红色虚线/高亮

全局反馈（底部状态栏）建议显示：

- 节点数
- 连线数
- 当前选中对象
- 校验摘要（如 `3 个配置错误 / 1 条非法连线`）

### 11.C.9 画布快捷键（v2.0 最小集）

- `Delete / Backspace`：删除选中节点/连线
- `Esc`：取消连线创建 / 清空选择

后续扩展：

- 撤销/重做
- 复制粘贴
- 空格平移

### 11.C.10 与 NodeInspector / 发布校验的联动

- 节点选中驱动 `NodeInspector`
- `displayName` 变化同步节点标签
- `ui.validationState` 同步节点红点
- 发布校验失败时将错误映射到节点/连线并高亮

### 11.C.11 前端实现分层建议（组件职责）

`WorkflowEditor` 负责：

- `nodes/edges` 状态
- 选中状态
- 校验结果分发
- 保存/发布/运行动作

`WorkflowCanvas` 负责：

- 渲染节点/连线
- 节点拖拽与连线交互
- 缩放与视图控制
- 通过回调上抛变更

### 11.C.12 v2.0 原型实现优先级（WorkflowCanvas）

1. 连线创建（含临时预览线）
2. 连线选择与删除
3. 节点删除（联动删除关联边）
4. 连线合法性校验（自连/重复边/非法来源目标）
5. 网格吸附（落点吸附）
6. 连线错误高亮与状态栏校验摘要
7. 适配画布（Fit to Content）

## 11.D Dashboard 指标口径与模块联动细化（v2.1）

> 目标：将 `Dashboard` 从静态展示升级为基于 `Run / RunEvent / Alert` 的统一监控总览，确保指标口径一致、模块跳转明确、状态解释清晰。

### 11.D.1 页面目标与核心问题

`Dashboard` 需要回答：

1. 当前整体运行健康度如何（成功/失败/部分成功/告警/SLA）？
2. 哪些对象或节点正在成为风险热点（失败热点、错误码热点）？
3. 当前运行中/排队中的任务有哪些，是否需要人工干预？
4. 能否从总览快速跳到 `Runs / Alerts / Workflow / Job` 做处理？

### 11.D.2 数据来源与聚合层（建议）

建议 `Dashboard` 使用统一聚合视图模型（即使前端 mock 也模拟这一层）：

- `runs[]`
- `runEvents[]`
- `alerts[]`
- `objects metadata`

建议聚合函数（原型级）：

- `buildDashboardSummary(runs, events, alerts, options)`

输出建议：

- `kpis`
- `trendSeries`
- `failureHotspots`
- `runningQueue`
- `alertSummary`

### 11.D.3 时间范围与统计窗口

建议时间范围：

- `1h`
- `24h`（默认）
- `7d`

影响范围：

- KPI
- 趋势图
- 失败热点
- 告警摘要（建议按 `lastSeen`）

说明：实时队列建议不完全受时间范围影响，而按当前运行状态展示（`running/queued/retrying`）。

### 11.D.4 KPI 指标定义（口径冻结建议）

运行次数（窗口内）：

- 统计窗口内 `Run.startTime` 落入范围的运行数

严格成功率（默认展示）：

- `strictSuccessRate = success / (success + failed + partial_success)`
- 分母排除 `cancelled`

部分成功数：

- `Run.status = partial_success` 的数量

失败数：

- `Run.status = failed` 的数量

平均耗时：

- 已结束运行（排除 `cancelled`）的平均 `durationMs`

SLA 违规数：

- 建议基于事件 `sla_breached` 统计（v1 可 mock）

当前队列长度：

- 当前 `running + queued + retrying` 的运行数（实时指标）

### 11.D.5 KPI 卡片展示建议（v2.1）

建议卡片：

1. 运行次数
2. 严格成功率
3. 部分成功数
4. 失败数
5. 平均耗时
6. SLA 违规数
7. 当前队列长度（版面允许时）

### 11.D.6 趋势图（Trend）口径与展示

数据来源：按 `Run.status` 聚合。

建议系列：

- `success`（绿）
- `partial_success`（橙）
- `failed`（红）

时间粒度建议：

- `1h`：5 分钟桶
- `24h`：小时桶
- `7d`：天桶

### 11.D.7 失败热点（Hotspots）定义与展示

建议按对象统计失败热点（v1）：

- 数据源优先 `node_completed_failed`
- 排序：失败次数降序 -> 最近失败时间降序

热点项建议字段：

- `objectName`
- `objectType`
- `failedCount`
- `lastFailTime`
- （可选）`topErrorCode`
- （可选）`topFailedNode`

### 11.D.8 实时运行队列（Running Queue）定义与交互

建议展示状态：

- `running`
- `queued`
- `retrying`（可由 `RunEvent` 推断标签）

建议列：

- `runId`
- `objectName`
- `objectType`
- `triggerType`
- `startTime`
- `elapsed`
- `currentNode`
- `status`
- 操作（终止 / 重跑 / 查看）

操作行为：

- `终止`：更新状态为 `cancelled`（或 `cancel_requested -> cancelled`）并移出队列
- `重跑`：打开 `RunTriggerDialog(mode=rerun)`
- `查看`：跳转 `RunDetail`

### 11.D.9 告警摘要模块（建议新增）

建议在 Dashboard 增加轻量告警摘要：

- `open` 告警数
- `critical` 告警数
- `未指派` 告警数
- （可选）最近告警 3 条

### 11.D.10 搜索框行为（页面顶栏搜索）

v2.1 最小行为建议：

- 匹配 `RunId / objectName`
- 过滤“实时队列”和“失败热点”模块

### 11.D.11 页面联动与跳转（必须明确）

KPI 跳转建议：

- `失败数` -> `RunsList?status=failed`
- `部分成功数` -> `RunsList?status=partial_success`
- `当前队列长度` -> `RunsList?status=running,queued`

模块跳转建议：

- 告警摘要 -> `AlertsList` 对应筛选
- 失败热点项 -> `WorkflowDetail` / `JobDetail`
- 实时队列行 -> `RunDetail`

### 11.D.12 前端聚合与刷新策略（v2.1）

刷新策略建议：

- 页面进入时加载一次
- 每 15~30 秒轮询刷新（原型可 mock）

显示建议：

- 顶部显示“最后更新时间”
- 刷新时使用轻量 loading，避免整体闪烁

### 11.D.13 空态与异常态（v2.1）

空态：

- 当前窗口无运行数据：KPI 显示 0，趋势/热点/队列显示空态提示

异常态：

- 聚合数据加载失败

建议使用模块级错误态，不阻断整个页面。

### 11.D.14 v2.1 原型实现优先级（Dashboard）

1. KPI 口径统一（含 `partial_success` 与严格成功率）
2. 趋势图增加 `partial_success` 系列
3. 失败热点改为基于 `RunEvent` 聚合 mock
4. 实时队列接 `Run` 状态与操作（终止/重跑/查看）
5. 告警摘要模块与跳转联动
6. 周期刷新与“最后更新时间”

## 11.E AlertRules 页面表单布局与规则模板交互细化（v2.2）

> 目标：把 `8.A AlertRule 条件构造器（v1 简化版）` 落成页面级规格，明确 `AlertRules` 页的列表、编辑表单、模板套用、校验与规则测试流程。

### 11.E.1 页面目标与使用场景

`AlertRules` 页面面向两类高频操作：

1. 新建规则（基于模板快速配置）
2. 调整已有规则（阈值、对象范围、通知渠道）

### 11.E.2 页面结构（建议）

建议结构：

1. 顶部栏（标题 + 新建规则按钮）
2. 左侧规则列表（列表/卡片）
3. 右侧编辑面板（选中规则后显示）
4. 页面下方通知渠道配置区（保留当前原型结构）

### 11.E.3 规则列表（Rule List）设计

列表摘要字段建议：

- `name`
- `enabled`
- `eventTypes`（数量 + 示例）
- `targetScope`
- `threshold`
- `dedup.aggregateWindowMinutes`
- `notify.channels`
- `updatedAt / updatedBy`

列表交互建议：

- 点击规则 -> 打开右侧编辑面板
- `复制规则`
- `删除规则`（二次确认）

### 11.E.4 新建规则流程（模板优先）

点击 `新建规则` 后建议先选择模板：

1. `节点失败即告警`
2. `连接离线即告警`
3. `连续失败 N 次告警`
4. `运行超时告警`

选择模板后：

- 生成预填充规则草稿
- 自动打开右侧编辑面板

### 11.E.5 规则编辑面板布局（核心）

固定分组建议：

1. 基础信息
2. 匹配条件
3. 阈值条件
4. 聚合与去重
5. 通知与动作
6. 高级设置（可选）

基础信息：

- `name`
- `enabled`
- `description`

匹配条件：

- `eventTypes`
- `targetScope.mode`
- `targetScope.objects/tags`
- `errorCodes`
- `severities`

阈值条件：

- `threshold.mode`
- `count / windowMinutes`（当 `count_in_window`）

聚合与去重：

- `dedup.enabled`
- `dedup.keyStrategy`（只读 `object_node_error`）
- `dedup.aggregateWindowMinutes`
- `dedup.reopenOnResolved`

通知与动作：

- `actions.notify.enabled`
- `actions.notify.channels`
- `actions.autoAssign.*`
- `actions.escalation.*`

高级设置（v2.2 可简化）：

- `notes`

### 11.E.6 表单状态管理（前端实现建议）

建议状态层：

- `selectedRule`
- `draftRule`
- `formValidationResult`
- `saveState`

切换规则时若有未保存修改，提示放弃/保存并切换。

### 11.E.7 表单校验规则（页面级）

- `name` 唯一
- `eventTypes` 至少 1 项
- `targetScope.mode=objects` 时对象列表非空
- `threshold.mode=count_in_window` 时：`count >= 2` 且 `windowMinutes >= 1`
- `dedup.aggregateWindowMinutes >= 1`
- `notify.enabled=true` 时至少 1 个渠道

### 11.E.8 规则测试（Rule Test / Match Preview）建议（v2.2 轻量版）

建议在编辑面板底部提供 `测试规则`：

- 输入：粘贴 `RunEvent` JSON
- 输出：是否命中、命中/未命中原因、`dedupKey` 预览

### 11.E.9 模板交互细化（Template UX）

模板卡片建议显示：

- 模板名称
- 简短说明
- 默认事件类型
- 默认阈值模式

套用模板后在编辑面板顶部显示提示条。

### 11.E.10 与其他模块联动

- 后续可从 `AlertsList` 告警详情跳转到对应规则并定位
- 若选择未配置渠道，提示并可定位到通知渠道配置区
- `errorCodes` 字段后续可接 `ErrorCode` 快捷选择

### 11.E.11 空态 / 异常态（v2.2）

空态：

- 无规则时展示“从模板创建第一条规则”

异常态：

- 列表加载失败
- 保存失败
- 测试规则失败（JSON 解析失败/判定异常）

### 11.E.12 v2.2 原型实现优先级（AlertRules）

1. 规则列表 + 右侧编辑面板框架
2. 模板创建（3~4 个模板）
3. 表单分组（基础/匹配/阈值/去重/通知）
4. 页面级校验与保存状态
5. 复制/删除规则
6. 轻量“测试规则（JSON 粘贴）”

## 11.F WorkflowsList / WorkflowDetail / WorkflowEditor 三页联动流程细化（v2.3）

> 目标：打通“列表浏览 -> 详情查看 -> 编辑编排 -> 校验/试运行 -> 发布 -> 回看版本/回滚”的工作流管理主线，形成平台核心业务闭环。

### 11.F.1 三页职责边界（建议）

`WorkflowsList`
- 浏览清单、筛选、轻量操作（查看详情/编辑/运行一次）

`WorkflowDetail`
- 生命周期动作中心（启停、运行、查看版本/运行历史、发起回滚）

`WorkflowEditor`
- 草稿编辑、校验、试运行、保存、发布

### 11.F.2 工作流生命周期模型（页面视角）

建议拆分两条状态轴：

版本状态：
- `draft`
- `published`
- `archived`（后续）

启用状态：
- `enabled`
- `disabled`

### 11.F.3 版本模型（建议）

页面至少能区分：

- `currentPublishedVersion`
- `draftVersion`
- `versionHistory[]`

版本记录字段建议：

- `version`
- `status`
- `createdBy / publishedBy`
- `createdAt / publishedAt`
- `changeSummary`
- `sourceVersion`

### 11.F.4 三页联动主流程（核心）

流程 1：列表 -> 详情 -> 编辑 -> 发布

1. `WorkflowsList` 进入 `WorkflowDetail`
2. `WorkflowDetail` 点击 `编辑`
3. `WorkflowEditor` 修改并 `校验`
4. `保存` 草稿
5. `发布` 新版本
6. 返回 `WorkflowDetail` / `WorkflowsList`，版本信息同步更新

流程 2：详情页运行一次（发布版）

1. `WorkflowDetail` 点击 `运行一次`
2. 打开 `RunTriggerDialog`
3. 生成 `Run` 并跳转 `RunDetail`

流程 3：编辑器试运行草稿

1. `WorkflowEditor` 点击 `试运行`
2. 打开 `RunTriggerDialog`
3. 使用当前草稿版本执行
4. 跳转 `RunDetail`（标记 `Draft Version`）

### 11.F.5 `WorkflowsList` 页面细化（联动视角）

建议卡片摘要字段：

- 工作流名称
- 发布状态（`Published / Draft only`）
- 启用状态（`Enabled / Disabled`）
- 当前发布版本号
- 草稿标记（`Has Draft Changes`）
- 最近发布时间/发布人
- 最近运行时间
- 成功率
- 触发器数量

卡片动作建议：

- `查看详情`
- `编辑`
- `运行一次`（仅已发布版本）

### 11.F.6 `WorkflowDetail` 页面细化（生命周期中心）

顶部摘要建议显示：

- 工作流名称
- 发布状态
- 启用状态
- 当前发布版本号
- 草稿版本号/未发布修改标记（若存在）
- 发布人/发布时间

动作按钮建议：

- `启用/停用`
- `运行一次`（发布版）
- `编辑`

版本记录 Tab 的回滚交互建议：

- 回滚本质是“基于历史版本创建新草稿”
- 点击回滚 -> 确认 -> 跳转 `WorkflowEditor` 并加载该版本为草稿

### 11.F.7 `WorkflowEditor` 页面细化（版本与发布中心）

顶部工具栏建议显示：

- 当前编辑版本（如 `v2.1.1-draft`）
- 草稿来源版本（可选）
- 草稿状态：`已保存 / 未保存修改 / 校验失败`

核心动作：

- `校验`
- `试运行`（草稿）
- `保存`（草稿）
- `发布`

保存与发布关系：

- `保存`：仅保存草稿
- `发布`：发布草稿为新版本（建议内部串行执行“保存 -> 校验 -> 发布”）

### 11.F.8 发布流程细化（v2.3）

建议流程：

1. 点击 `发布`
2. 若有未保存修改 -> 先保存草稿
3. 执行全局校验
4. 发布确认弹窗（填写 `changeSummary`）
5. 发布成功 -> 更新版本信息与页面状态

### 11.F.9 试运行草稿 vs 运行发布版的区别展示

建议在 `RunDetail` 显式标记来源版本类型：

- `Published Version`
- `Draft Version`

后续可在 `Run` 数据增加：

- `workflowVersion`
- `workflowVersionType` (`published | draft`)

### 11.F.10 三页联动数据刷新策略（原型建议）

建议使用共享 mock store（Context/Zustand）统一维护：

- `workflow summaries`
- `workflow details`
- `versionHistory`

页面动作直接更新 store，避免列表/详情/编辑器数据不一致。

### 11.F.11 异常态与边界场景（v2.3）

关键边界场景：

1. 无发布版本，仅有草稿（`Draft only`）
2. 已发布但停用（仍可手动运行，计划/触发器不自动触发）
3. 发布失败（保留草稿与校验结果）
4. 回滚来源版本不可用（禁用回滚并给出原因）

### 11.F.12 v2.3 原型实现优先级（三页联动）

1. 统一版本视图模型
2. 详情页顶部版本/状态增强
3. 编辑器保存/发布/试运行行为联动
4. 版本记录回滚入口（创建草稿并进入编辑器）
5. 列表页增加 `Has Draft Changes / Draft only` 标记
6. 三页共享 mock store 刷新一致性

## 11.G Schedules / Triggers 统一触发入口与参数映射交互细化（v2.4）

> 目标：统一 `Schedule` 与 `Trigger` 在“绑定对象、参数映射、触发前校验、Run 创建、事件上报”上的行为与页面交互，减少配置分裂与运行语义不一致。

### 11.G.1 设计目标与范围

覆盖模块：

- `SchedulesList / ScheduleEdit`
- `TriggersList / TriggerDetail`（及后续 Trigger 编辑页）

统一目标：

1. 都可绑定 `Job` 或 `Workflow`
2. 都产出统一 `Run`（`triggerType` 不同）
3. 都支持参数映射/参数传递
4. 都支持触发前校验
5. 都产出 `RunEvent`（trigger/scheduler 级事件）

### 11.G.2 统一触发模型（页面与数据视角）

建议抽象统一触发绑定配置：

```ts
interface TriggerBindingConfig {
  target: {
    objectType: "job" | "workflow";
    objectId: string;
    objectName?: string;
  };
  paramsMapping?: ParamMappingConfig;
  validation?: TriggerValidationConfig;
  enabled: boolean;
}
```

### 11.G.3 绑定对象交互（Schedule / Trigger 共用规则）

绑定对象范围：

- `Workflow`
- `Job`

页面展示建议：

- 下拉按分组显示：`工作流` / `作业`

选择对象后联动：

1. 加载对象参数 schema
2. 展示对象摘要（名称、类型、状态、版本）
3. 校验对象是否可触发（启用状态、发布状态）

### 11.G.4 参数映射模型（统一）

目标：将来源数据映射为 `Run.params`。

建议结构：

```ts
interface ParamMappingConfig {
  mode: "none" | "default_only" | "custom_mapping";
  items: Array<{
    targetKey: string;
    sourceType: "constant" | "schedule_context" | "trigger_payload" | "trigger_meta" | "system";
    sourceExpr: string;
    defaultValue?: unknown;
    required?: boolean;
  }>;
}
```

`Schedule` 常见来源：

- `${schedule.fireTime}`
- `${schedule.plannedTime}`
- `${schedule.timezone}`
- `${schedule.date}`

`Trigger` 常见来源：

- `${payload.xxx}`
- `${headers.xxx}`
- `${sourceIp}`
- `${eventId}`

### 11.G.5 `ScheduleEdit` 页面交互细化（v2.4）

建议分区：

1. 基础信息
2. 时间规则配置（cron/interval/calendar/window）
3. 绑定对象
4. 参数映射
5. 触发前校验与预览

增强建议：

- 统一显示“下一次触发预览”（至少 3~5 次）
- 绑定对象后显示参数 schema 与对象摘要
- 参数映射支持常见快捷模板（如 `DATE <- ${schedule.date}`）
- 预览区展示“预计 `Run.params` 示例”

### 11.G.6 `TriggersList` 页面细化（列表层）

建议列表摘要增强：

- `targetType`（Job / Workflow）
- 状态（enabled/disabled）
- 最近触发时间
- 最近结果（可选）
- 测试触发入口（支持测试的 Trigger）

### 11.G.7 `TriggerDetail` 页面交互细化（Webhook 重点）

建议分区：

1. 顶部摘要
2. 触发入口配置（URL/签名/白名单）
3. 绑定对象
4. Payload 参数映射
5. 测试触发
6. 最近触发记录

测试触发建议支持两种模式：

1. `仅校验映射`（不创建 Run）
2. `实际测试触发`（创建 `Run(triggerType=webhook)`）

执行结果：

- 映射结果预览
- 校验错误（签名/白名单/schema/映射）
- 若实际触发成功：返回 `runId` 并跳转 `RunDetail`

### 11.G.8 触发前校验规则（Schedule / Trigger 共用）

对象层：

- 目标对象存在
- 目标对象可执行（启用、版本状态符合要求）

参数层：

- 必填参数有映射或默认值
- 表达式语法有效

来源层：

`Schedule`
- Cron/时间规则合法
- 时区合法

`Trigger`（Webhook）
- 签名配置完整（如启用）
- 白名单格式合法
- Payload/schema 校验通过

### 11.G.9 与 `Run` / `RunEvent` 的联动（落地）

`Schedule` 触发事件链建议：

1. `schedule_due`
2. `schedule_dispatched` 或 `schedule_skipped / schedule_parse_failed`
3. 创建 `Run(triggerType=schedule)` -> `run_created` -> `run_started`

`Trigger`（Webhook）事件链建议：

1. `trigger_received`
2. `trigger_validated` 或 `trigger_rejected`
3. `trigger_mapped`
4. `trigger_dispatched`
5. 创建 `Run(triggerType=webhook)`

参数映射结果统一写入 `Run.params`。

### 11.G.10 页面联动与跳转（必须明确）

- `ScheduleEdit` 保存成功 -> 返回列表或保留编辑页（v2.4 可先返回列表）
- `TriggerDetail` 测试触发成功 -> 跳转 `RunDetail`
- 最近触发记录中的运行实例可跳 `RunDetail`
- 绑定对象可跳转 `WorkflowDetail` / `JobDetail`

### 11.G.11 前端状态管理建议（v2.4）

建议拆分状态：

- `scheduleDraft` / `triggerDraft`
- `targetObjectSchema`
- `paramMappingDraft`
- `validationResult`
- `previewResult`
- `submitState`

说明：`ScheduleEdit` 与 `TriggerDetail(编辑态)` 可复用参数映射编辑组件。

### 11.G.12 空态 / 异常态（v2.4）

空态：

- 无可绑定对象（无 Job/Workflow） -> 引导先创建对象

异常态：

- 对象参数 schema 加载失败
- 映射预览失败
- 测试触发失败
- 保存失败

建议按区域显示错误并保留用户输入。

### 11.G.13 v2.4 原型实现优先级（Schedules / Triggers）

1. 绑定对象统一选择（Workflow/Job 分组）
2. 参数映射区（基础 key -> source 映射）
3. 触发前校验与预览（计划预览 / 映射预览）
4. Webhook 测试触发（校验模式 + 实际触发）
5. `RunEvent` 触发链 mock（schedule/trigger 事件）
6. 与 `RunDetail` 跳转联动

## 11.H Connections 模块与健康检查/事件上报/告警联动细化（v2.5）

> 目标是让 `Connections` 模块从“资源配置页”升级为“资源健康状态 -> 事件上报 -> 告警联动”的运维闭环入口，覆盖 SQL Server 与 Windows Host 两类执行资源。

### 11.H.1 页面目标与职责边界

`Connections` 模块承担三类职责：

1. 资源配置与资产管理
- SQL Server 连接配置
- Windows Host / Agent 配置

2. 资源健康可视化
- 当前健康状态
- 最近健康检查结果
- 最近异常/恢复情况

3. 事件上报与告警联动
- 健康检查结果转化为 `RunEvent`（`stage=connection`）
- 命中 `AlertRule` 后生成 `Alert`

### 11.H.2 连接对象模型（原型展示层）

建议连接对象在原型中统一包含以下字段：

- `connectionId`
- `connectionType`（`sql_server | windows_host`）
- `name`
- `enabled`
- `status`（`online | offline | degraded | unknown`）
- `lastCheckAt`
- `lastSuccessAt`
- `lastErrorCode`
- `lastErrorMessage`
- `tags`

类型特有字段建议：

`sql_server`
- `host`
- `port`
- `instanceName`
- `authType`
- `defaultDatabase`（可选）

`windows_host`
- `host`
- `agentVersion`
- `osVersion`（可选）
- `pythonEnvs[]`（可选展示）

### 11.H.3 ConnectionsList 列表页交互细化（双 Tab）

#### A. 顶部结构与 Tab

- `SQL Server`
- `Windows Hosts`

列表页顶部建议包含：

- 搜索框（按名称/主机名模糊匹配）
- 状态筛选（online/offline/degraded/unknown）
- 启用状态筛选（启用/停用）

#### B. SQL Server 列表列建议

建议字段：

- 名称
- 主机/实例
- 认证方式
- 状态（online/offline/degraded）
- 最近检查时间
- 最近错误码
- 操作（查看 / 测试 / 编辑）

#### C. Windows Host 列表列建议

建议字段：

- 名称
- 主机地址
- Agent 版本
- 状态
- 最近心跳/检查时间
- 最近错误码
- 操作（查看 / 测试）

#### D. 状态标签语义

- `online`：绿色，最近健康检查成功
- `offline`：红色，无法连接或 Agent 离线
- `degraded`：橙色，连接可达但存在能力异常（如延迟高、部分能力不可用）
- `unknown`：灰色，尚未检测或无历史数据

### 11.H.4 ConnectionDetail 详情页结构与信息分层

#### A. 页面分区建议

详情页建议采用 2~3 区块布局：

1. 基础信息与状态摘要
2. 能力信息 / 资源信息（如 Python 环境、Agent 信息）
3. 健康检查记录与连接事件时间线
4. 关联告警与告警状态
5. 依赖引用（被哪些 Job / Workflow 使用）

#### B. 健康检查记录面板

记录建议字段：

- 检查时间
- 检查结果（success/failed/degraded）
- 耗时
- 错误码
- 错误摘要

v2.5 原型建议展示最近 10 条 mock 记录。

#### C. 连接事件面板（Connection Events）

建议直接复用 `RunEvent` 展示结构（`stage=connection`），重点事件：

- `connection_check_success`
- `connection_check_failed`
- `connection_offline`
- `connection_recovered`

列表字段建议：

- 时间
- 事件类型
- severity
- errorCode
- message

### 11.H.5 健康检查结果标准化（原型侧）

> 即使原型阶段没有真实探活，也建议先把“健康检查结果对象”定义好，便于后续接入真实执行器或定时任务。

建议结果对象：

```ts
interface ConnectionHealthCheckResult {
  connectionId: string;
  connectionType: "sql_server" | "windows_host";
  checkType: "manual" | "scheduled";
  status: "success" | "failed" | "degraded";
  durationMs: number;
  errorCode?: string;
  message?: string;
  checkedAt: string;
  metrics?: Record<string, unknown>;
}
```

`metrics` 示例：

- SQL：`serverVersion`, `latencyMs`
- Windows Host：`agentVersion`, `heartbeatLagMs`

### 11.H.6 事件上报与告警联动（核心）

#### A. 事件上报链路

- `ConnectionsList` 点击 `测试` 或系统定时探活
- 生成健康检查结果（mock 或真实）
- 标准化为 `RunEvent`（`stage=connection`）
- 命中 `AlertRule` 后生成/聚合 `Alert`

#### B. v2.5 推荐最小事件集

1. `connection_check_success`
2. `connection_check_failed`
3. `connection_offline`
4. `connection_recovered`

说明：

- `connection_check_failed` 用于单次检查失败记录
- `connection_offline` 用于状态从非离线切换到离线（状态变化事件）
- `connection_recovered` 用于离线恢复后的状态变化事件

#### C. 告警规则建议（连接类）

连接类告警建议提供模板规则：

- `连接离线立即告警`（事件型：`connection_offline`）
- `连接检查连续失败 N 次告警`（窗口计数型：`connection_check_failed`）
- `连接恢复通知`（可选，低优先级）

默认去重键仍遵循平台规则：

- `对象 + 节点 + 错误码`
- 连接类事件中 `nodeId` 可固定为 `-`

### 11.H.7 与 Job / Workflow 的依赖联动

为增强“问题定位效率”，`ConnectionDetail` 建议展示引用关系：

- 被哪些 `Job` 使用
- 这些 `Job` 被哪些 `Workflow` 引用（可折叠展示）

当连接离线时，详情页可提示潜在影响范围：

- 受影响 Job 数
- 受影响 Workflow 数
- 最近 24h 相关失败运行数（后续增强）

### 11.H.8 页面交互与状态管理建议（原型级）

#### A. 操作入口

- `ConnectionsList` 行内 `测试`
- `ConnectionDetail` 顶部 `立即测试`

#### B. 测试交互（v2.5）

1. 点击 `测试`
2. 按钮进入 loading 状态
3. 生成 mock 健康检查结果
4. 刷新列表/详情状态
5. 追加连接事件（如失败则触发告警联动）

#### C. 前端状态管理建议

建议在 mock store 中增加：

- `connections[]`
- `connectionHealthChecksById`
- `connectionEventsById`

并与：

- `alerts[]`
- `alertRules[]`
- `runEvents[]`（或统一事件池）联动

### 11.H.9 v2.5 实现优先级（原型）

1. `ConnectionsList` 状态标签 + 测试按钮 + mock 状态变更
2. `ConnectionDetail` 健康检查记录 + 连接事件面板
3. 连接事件生成 `Alert`（先走模板规则）
4. 依赖引用展示（Job/Workflow 计数与列表）

## 11.I 前端 mock store 数据结构总纲（v2.6）

> 目标是把当前原型中分散在各页面的 mock 数据收敛为一套“可联动”的前端数据层，支撑列表页、详情页、编辑器、运行中心、告警中心之间的状态同步与跳转。

### 11.I.1 设计目标与边界

v2.6 mock store 主要解决三类问题：

1. 跨页面联动
- 在 `WorkflowEditor` 保存草稿后，`WorkflowsList / WorkflowDetail` 可立即看到变更
- 手动触发后，`RunsList / RunDetail / Dashboard / AlertsList` 同步反映

2. 统一数据语义
- `Run / RunEvent / Alert / AlertRule` 使用同一份模型与字段口径
- `Workflow / Job / Schedule / Trigger / Connection` 的引用关系可追踪

3. 原型交互可演示
- 支持按钮点击触发 mock 业务动作（运行、重试、告警生成、连接测试）
- 不依赖后端即可形成“配置 -> 执行 -> 监控 -> 告警”的闭环演示

边界说明：

- v2.6 不要求实现完整状态管理库能力（如撤销栈、持久化同步冲突）
- 优先保证“可读、可改、可联动、可演示”

### 11.I.2 Store 总体结构（推荐分片）

建议采用“实体分片 + UI 分片 + 派生选择器”结构。

实体分片（业务数据）：

- `workflows`
- `jobs`
- `schedules`
- `triggers`
- `runs`
- `runEvents`
- `alerts`
- `alertRules`
- `connections`
- `connectionHealthChecks`
- `workspaces`（后续接入登录/工作空间时使用）

UI 分片（页面态）：

- `workflowEditorUi`
- `runTriggerDialogUi`
- `alertsUi`
- `dashboardUi`
- `globalUi`（搜索、刷新时间等）

### 11.I.3 实体存储方式（规范化优先）

建议所有核心实体使用“规范化存储”：

- `byId: Record<string, Entity>`
- `allIds: string[]`

示例：

```ts
interface EntityState<T> {
  byId: Record<string, T>;
  allIds: string[];
}
```

优点：

- 单对象更新成本低
- 列表与详情共享同一引用来源
- 便于做跨实体关系解析（如 `connectionId -> jobs -> workflows`）

### 11.I.4 核心分片建议字段（原型级）

#### A. `workflows` 分片

建议最小字段：

- `workflowId`
- `name`
- `enabled`
- `currentPublishedVersionId`
- `draftVersionId`
- `tags`
- `statsSummary`（成功率、平均耗时、失败数）

配套子实体（可同分片内存）：

- `workflowVersionsById`
- `workflowDraftsById`

#### B. `jobs` 分片

建议最小字段：

- `jobId`
- `name`
- `jobType`（sql/python/stored_proc/sql_agent/windows_task）
- `connectionId`
- `enabled`
- `tags`
- `statsSummary`

#### C. `runs` 与 `runEvents` 分片（核心）

`runs`：
- 统一 `Run` 模型（已在前文定义）

`runEvents`：
- 建议同时维护：
  - `eventsById`
  - `eventIdsByRunId`

这样 `RunDetail` 查询时间线时无需全表扫描。

#### D. `alerts` 与 `alertRules` 分片

`alerts`：
- `byId + allIds`
- 可选索引：`alertIdsByRunId`

`alertRules`：
- `ruleId`
- `enabled`
- `matchConfig`
- `thresholdConfig`
- `dedupConfig`
- `notificationConfig`

#### E. `connections` 相关分片

- `connections`
- `connectionHealthChecksByConnectionId: Record<string, ConnectionHealthCheckResult[]>`
- `connectionEventIdsByConnectionId: Record<string, string[]>`

说明：
- 连接事件实体本体仍建议进入统一 `runEvents` 池（`stage=connection`）
- 页面维度额外维护按连接分组索引，提升查询便利性

### 11.I.5 UI 分片设计（页面态与业务态分离）

#### A. `workflowEditorUi`

- `activeWorkflowId`
- `activeVersionMode`（`draft | published_preview`）
- `selectedNodeId`
- `selectedEdgeId`
- `canvasViewState`
- `validationResult`
- `isDirty`

#### B. `runTriggerDialogUi`

- `open`
- `sourceType`（`job | workflow | rerun`）
- `targetObjectId`
- `mode`（`manual_run | rerun`）
- `formDraft`
- `validationErrors`
- `submitState`

#### C. `alertsUi`

- `selectedAlertId`
- `drawerOpen`
- `filters`
- `tableSort`

#### D. `dashboardUi`

- `timeRange`
- `autoRefreshEnabled`
- `autoRefreshIntervalSec`
- `lastRefreshedAt`

### 11.I.6 关键索引与派生选择器（决定联动效率）

建议将“关系解析逻辑”封装为 selector，而不是散落在页面组件中。

必备 selector（v2.6）：

1. 运行与时间线
- `selectRunById(runId)`
- `selectRunEvents(runId)`（按 `sequence/time` 排序）
- `selectRunAlerts(runId)`

2. 工作流联动
- `selectWorkflowCurrentPublishedVersion(workflowId)`
- `selectWorkflowDraftVersion(workflowId)`
- `selectWorkflowRuns(workflowId)`

3. 告警联动
- `selectAlertDetail(alertId)`（组合 Alert + Rule + Run + Event）
- `selectAlertsByStatus(status)`

4. 连接影响分析
- `selectConnectionJobs(connectionId)`
- `selectConnectionWorkflows(connectionId)`
- `selectConnectionRecentEvents(connectionId)`

5. Dashboard 聚合
- `selectDashboardKpis(timeRange)`
- `selectRunTrendSeries(timeRange)`
- `selectFailureHotspots(timeRange)`

### 11.I.7 原型动作（Actions）建议清单

为保证页面可演示，建议定义一组“高价值动作”，由 UI 调用而不是直接改 store：

对象编辑类：

- `saveWorkflowDraft`
- `publishWorkflow`
- `rollbackWorkflowToDraft`
- `updateNodeConfig`

触发执行类：

- `triggerRunManual`
- `triggerRunRerun`
- `appendRunEvent`
- `completeRun`

告警类：

- `evaluateAlertRulesForEvent`
- `upsertAlertByDedupKey`
- `acknowledgeAlert`
- `assignAlert`
- `muteAlert`
- `resolveAlert`

连接类：

- `runConnectionHealthCheck`
- `appendConnectionEvent`
- `updateConnectionStatus`

### 11.I.8 关键联动流程（按动作串联）

#### A. 手动触发工作流 -> 运行 -> 告警

1. `triggerRunManual`
2. 写入 `runs`
3. 追加 `run_created / run_started`
4. 根据模拟执行结果追加节点事件与完成事件
5. 对告警候选事件执行 `evaluateAlertRulesForEvent`
6. 命中规则则 `upsertAlertByDedupKey`
7. Dashboard / Runs / Alerts 通过 selector 自动刷新展示

#### B. 连接测试 -> 状态变化 -> 告警

1. `runConnectionHealthCheck(connectionId)`
2. 生成 `ConnectionHealthCheckResult`
3. 更新 `connections.byId[connectionId].status`
4. 追加 `stage=connection` 事件
5. 命中规则生成/聚合告警

#### C. 编辑器保存草稿 -> 列表/详情同步

1. `updateNodeConfig`
2. `saveWorkflowDraft`
3. 更新 `workflowDraftsById` 与 `workflows.byId[workflowId].draftVersionId`
4. `WorkflowsList / WorkflowDetail` 显示 `Has Draft Changes`

### 11.I.9 原型 mock 数据初始化策略

建议初始化时提供 3 套样例数据（支撑演示）：

1. 正常成功链路
- 工作流执行成功，无告警

2. `partial_success` 链路
- 节点失败 -> 补偿成功 -> `partial_success`
- 可展示 Run 时间线与降级完成语义

3. 失败告警聚合链路
- 同一对象+节点+错误码连续失败
- 告警按 dedupKey 聚合计数

### 11.I.10 持久化策略（原型级可选）

v2.6 如需增强演示连续性，可增加本地持久化：

- `localStorage` 存储部分分片（如 `workflows`, `alertsUi.filters`, `dashboardUi.timeRange`）
- `runs / runEvents` 可仅保留最近 N 条，避免体积膨胀

建议：

- 先实现内存态
- 再按需补 `localStorage` 持久化（单向恢复）

### 11.I.11 技术实现建议（不绑定框架）

可选实现方式：

1. `Zustand`（推荐原型期）
- 上手快，适合 UI + 业务动作混合管理
- selector 写法灵活

2. `React Context + useReducer`
- 依赖少
- 但跨模块派生与性能优化成本较高

无论使用哪种方案，建议保持：

- 类型定义集中（`src/app/types/*`）
- actions 集中（`src/app/store/actions/*`）
- selectors 集中（`src/app/store/selectors/*`）

### 11.I.12 v2.6 实现优先级（原型）

1. 落地 `runs / runEvents / alerts / alertRules` 统一 store（支撑运行与告警联动）
2. 落地 `workflows / workflowVersions / workflowEditorUi`（支撑三页联动）
3. 落地 `connections + healthChecks + connectionEvent索引`（支撑连接页闭环）
4. 补 Dashboard selectors（KPI/趋势/热点）
5. 视需要增加本地持久化

## 11.J Settings 模块重构（移除环境后）与全局策略设计细化（v2.7）

> 在取消 `Prod / Pre / Dev` 后，`Settings` 模块需要从“环境配置入口”转型为“平台全局策略与治理配置中心”，重点承载运行默认策略、日志保留、告警默认规则、命名与标签规范等能力。

### 11.J.1 重构目标与职责边界

`Settings` 页面在 v2.7 的目标：

1. 提供平台级默认策略
- 为 `Job / Workflow / Trigger / Run` 提供默认配置基线
- 减少编辑器与创建表单中的重复输入

2. 提供治理配置入口
- RBAC（角色/用户）
- 全局变量
- 标签规范
- 命名规范（原型可简化为说明+示例）

3. 提供运维策略入口
- 日志保留
- 告警默认规则模板
- 通知渠道默认配置（与 `AlertRules` 页联动）

边界说明：

- `Settings` 不替代对象级配置（如节点级重试、工作流级发布策略）
- `Settings` 提供默认值与约束规则，对象级配置可覆盖（后续可定义“是否允许覆盖”）

### 11.J.2 页面结构建议（Tab 重构）

建议替换原“环境配置”Tab，采用以下结构：

1. `运行默认策略`
2. `日志与保留策略`
3. `告警默认策略`
4. `全局变量`
5. `角色与权限`（RBAC）
6. `标签与命名规范`

说明：

- v2.7 原型优先实现前 3 个 Tab（与运行闭环强相关）
- `全局变量 / RBAC / 标签规范` 可先做骨架与示例数据

### 11.J.3 运行默认策略（核心 Tab）

#### A. 页面目标

统一配置平台默认运行行为，供以下场景回填：

- 新建 Job
- 新建 Workflow 节点执行策略
- 手动触发弹窗默认选项（部分字段）
- Trigger / Schedule 的默认执行选项（后续）

#### B. 建议字段分组

1. 执行默认值
- `defaultNodeTimeoutSec`
- `defaultRunTimeoutSec`（可选）
- `defaultPriority`（`low | normal | high`，原型可先固定 `normal`）

2. 重试默认值
- `defaultRetryEnabled`
- `defaultMaxAttempts`（不含首次）
- `defaultRetryIntervalType`（`fixed | exponential`）
- `defaultRetryBaseIntervalSec`
- `defaultRetryMaxIntervalSec`（指数退避时）
- `defaultAfterRetryExhaustedAction`（建议默认 `terminate`）

3. 失败与降级默认值
- `defaultAlertOnFailure`
- `defaultOnFailureAction`（建议默认 `terminate`）
- `defaultJoinPolicy`（默认 `all_success`）

4. 手动触发默认值（可选）
- `defaultDryRunVisible`（控制是否展示 `dryRun` 开关）
- `defaultCommentRequired`（手动触发说明是否必填）

#### C. 与对象级配置的覆盖规则（建议文案）

建议在页面中明确展示：

- `平台默认值 -> 创建时回填`
- `对象保存后可独立修改`
- `修改平台默认值不会回写历史对象配置`

### 11.J.4 日志与保留策略 Tab

#### A. 页面目标

统一定义运行日志、事件、告警数据的保留周期与清理策略（原型阶段先做配置表达，不做真实清理任务）。

#### B. 建议字段

1. 运行数据保留
- `runRetentionDays`
- `runEventRetentionDays`
- `keepRecentRunsCount`（可选，原型优化项）

2. 日志保留
- `rawLogRetentionDays`
- `structuredLogRetentionDays`
- `errorSummaryRetentionDays`

3. 告警与审计保留
- `alertRetentionDays`
- `alertEventRetentionDays`（后续）
- `auditRetentionDays`（后续）

4. 清理策略（原型表达）
- `cleanupEnabled`
- `cleanupSchedule`（cron 字符串，占位即可）
- `cleanupBatchSize`（可选）

#### C. 页面提示文案建议

- 原型阶段仅展示配置，不触发真实清理任务
- 真实系统落地时需结合存储容量与合规要求评估保留周期

### 11.J.5 告警默认策略 Tab（与 AlertRules 协同）

#### A. 页面定位

该 Tab 不替代 `AlertRules` 页面，而是定义“新规则的默认值”和“系统内置模板开关”。

#### B. 建议字段分组

1. 规则默认值
- `defaultDedupWindowMin`
- `defaultThresholdWindowMin`
- `defaultNotificationChannels`
- `defaultSeverityMappingMode`（后续）

2. 内置模板开关（推荐）
- `enableTemplateRunFailed`
- `enableTemplateRunTimeout`
- `enableTemplateNodeRetryExhausted`
- `enableTemplateConnectionOffline`

3. 告警行为默认值
- `defaultAutoAssignEnabled`（后续）
- `defaultMuteDurationMin`（静默默认时长）
- `defaultReopenPolicy`（后续）

#### C. 与 `AlertRules` 页联动建议

- 在 `AlertRules` 新建规则时，读取 Settings 默认值进行回填
- 禁用某个“内置模板开关”时：
  - 不删除既有规则
  - 仅阻止“自动生成模板规则”或提示未启用

### 11.J.6 全局变量 Tab（原型骨架）

#### A. 页面目标

提供在 Job / Workflow / Trigger 参数映射中可引用的全局变量定义入口。

#### B. 建议字段

- `key`
- `value`（原型可明文）
- `description`
- `category`
- `isSecret`（原型可仅展示标记，不做加密）
- `updatedAt`

#### C. 与其他模块联动

- `NodeInspector` 输入映射中可引用（例如 `${globals.BIZ_DATE}`)
- `RunTriggerDialog` 参数默认值可使用变量解析（后续）

### 11.J.7 角色与权限（RBAC）Tab（原型骨架）

#### A. v2.7 范围

先明确角色与能力边界，不展开细粒度权限引擎。

建议内置角色示例：

- `Admin`
- `Operator`
- `Developer`
- `Viewer`

#### B. 原型展示重点

- 角色列表
- 角色权限摘要（页面访问 + 关键动作）
- 用户与角色绑定关系

关键动作示例：

- 发布工作流
- 手动触发运行
- 解决/静默告警
- 编辑连接配置
- 修改平台设置

### 11.J.8 标签与命名规范 Tab（原型骨架）

#### A. 页面目标

为对象管理、搜索与告警范围过滤提供统一规范。

#### B. 建议内容

1. 标签分类示例
- 业务域
- 系统域
- 重要级别
- 责任团队

2. 命名规范示例（说明型）
- Workflow 命名规则
- Job 命名规则
- Trigger 命名规则
- Connection 命名规则

3. 校验策略（后续）
- 命名正则
- 必填标签列表

### 11.J.9 Settings 数据模型建议（原型级）

建议将 Settings 拆为多个配置对象，而不是一个巨型 JSON。

示例分片：

- `runtimeDefaults`
- `retentionPolicy`
- `alertDefaults`
- `globalVariables`
- `rbacConfig`
- `taggingPolicy`

这样便于：

- 分 Tab 保存
- 局部回滚
- 页面按需加载（后续）

### 11.J.10 页面交互与保存策略

#### A. 保存模式建议

采用“Tab 内编辑、Tab 内保存”模式，避免一个页面全局提交过重。

每个 Tab 建议具备：

- `保存`
- `重置`（恢复到已保存值）
- `恢复默认`（平台内置默认值，需确认）

#### B. 脏状态提示

- 切换 Tab 时若未保存，提示：
  - `保存并切换`
  - `放弃修改`
  - `取消`

#### C. 校验反馈

- 字段级错误（如数字范围、Cron 格式）
- Tab 顶部汇总错误提示（适合字段较多的 Tab）

### 11.J.11 与其他模块的联动关系（关键）

1. 与 `WorkflowEditor / NodeInspector`
- 回填默认重试/超时/失败动作/joinPolicy

2. 与 `RunTriggerDialog`
- 回填 `dryRun` 可见性、comment 是否必填等默认行为

3. 与 `AlertRules`
- 回填新规则默认去重窗口、通知渠道、模板开关状态

4. 与 `Dashboard`
- 保留策略不直接影响 Dashboard 逻辑，但会影响历史统计时间跨度（后续提示）

5. 与 `Connections`
- 告警默认策略可影响连接事件模板规则启用状态

### 11.J.12 v2.7 实现优先级（原型）

1. `运行默认策略` Tab（字段+保存+回填演示）
2. `告警默认策略` Tab（与 `AlertRules` 新建规则联动）
3. `日志与保留策略` Tab（配置表达）
4. `全局变量 / RBAC / 标签规范` 骨架页

## 11.K 前端 mock store 实现级规格（分片字段 / Selectors / Actions 约定）（v2.8）

> 本节在 `11.I` 总纲基础上继续细化，目标是形成“前端可直接落代码”的 store 规格，减少后续实现时的字段歧义与命名漂移。

### 11.K.1 设计原则（实现约束）

1. 业务实体与 UI 状态分离
- 实体状态进入 `entities/*` 分片
- 页面态进入 `ui/*` 分片

2. 派生数据不落库
- KPI、趋势、热点、聚合统计通过 selector 计算
- 避免在 store 中维护重复统计字段（除非有明确性能需求）

3. 动作有边界
- UI 组件不直接写实体对象
- 通过 actions 修改 store，便于后续接入真实 API

4. 命名稳定
- selector 使用 `select*`
- action 使用动词开头
- payload 明确区分 `Input / Result / Context`

### 11.K.2 Store 根结构建议（示意）

```ts
interface AppStoreState {
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
    alerts: AlertsUiState;
    dashboard: DashboardUiState;
    global: GlobalUiState;
  };
  meta: {
    seedVersion: string;
    lastMutationAt?: string;
  };
}
```

说明：

- `indexes` 用于页面查询与联动加速，不视为“独立业务实体”
- `meta.seedVersion` 便于未来升级 mock 数据结构时做迁移/重置判断

### 11.K.3 分片字段清单（实现优先级版本）

#### A. `entities.workflows`

建议字段（最小可用）：

- `workflowId`
- `name`
- `enabled`
- `status`（`active | disabled`，展示态）
- `currentPublishedVersionId`
- `draftVersionId`
- `tags`
- `createdAt`
- `updatedAt`
- `owner`

建议字段（增强）：

- `statsSummary`（仅用于列表快显，可由 selector 覆盖）
- `triggerCount`
- `scheduleCount`

#### B. `entities.workflowVersions`

建议字段：

- `versionId`
- `workflowId`
- `versionNo`
- `versionType`（`draft | published | archived`）
- `graph`（nodes / edges）
- `paramsSchema`
- `publishedAt?`
- `publishedBy?`
- `changeNote?`
- `basedOnVersionId?`

说明：

- 原型期可允许 `graph` 直接内嵌（不必再拆节点实体表）
- 后续如编辑性能受限，再考虑 `nodes/edges` 独立规范化

#### C. `entities.jobs`

建议字段：

- `jobId`
- `name`
- `jobType`
- `connectionId?`
- `enabled`
- `tags`
- `definition`（按类型配置）
- `runtimeDefaults?`（对象级覆盖）
- `createdAt`
- `updatedAt`

#### D. `entities.schedules`

建议字段：

- `scheduleId`
- `targetType`（`job | workflow`）
- `targetId`
- `enabled`
- `scheduleType`（`cron | interval | calendar`）
- `scheduleConfig`
- `paramMappingConfig?`
- `nextFireTime?`
- `lastFireTime?`
- `lastRunId?`

#### E. `entities.triggers`

建议字段：

- `triggerId`
- `triggerType`（`manual | webhook | upstream`）
- `targetType`
- `targetId`
- `enabled`
- `paramMappingConfig?`
- `securityConfig?`（Webhook 签名、白名单等）
- `lastTriggeredAt?`
- `lastRunId?`

#### F. `entities.runs`

沿用统一 `Run` 模型，并建议补充原型常用字段：

- `runId`
- `objectType`
- `objectId`
- `objectName`
- `triggerType`
- `status`
- `startTime`
- `endTime?`
- `durationMs?`
- `initiator`
- `rootRunId?`
- `parentRunId?`
- `failedNodeId?`
- `errorCode?`
- `errorSummary?`
- `isDryRun?`
- `finalStatusReason?`

#### G. `entities.runEvents`

沿用 `RunEvent` 模型，并在原型实现中确保这些字段必有：

- `eventId`
- `runId`（连接事件可用伪 runId 或统一系统 runId，二选一；推荐真实保留 `runId` 可空并放宽类型）
- `eventType`
- `stage`
- `severity`
- `time`
- `sequence`
- `message`

建议：

- 若连接类事件不绑定 `Run`，可在类型上允许 `runId?: string`
- 或统一为 `SYS-CONN-{connectionId}-{timestamp}` 伪 runId（原型实现更简单）

#### H. `entities.alerts`

建议字段：

- `alertId`
- `status`
- `ruleId`
- `runId?`
- `objectType`
- `objectId`
- `objectName`
- `nodeId?`
- `errorCode?`
- `summary`
- `dedupKey`
- `count`
- `firstSeen`
- `lastSeen`
- `assignee?`
- `mutedUntil?`
- `resolvedAt?`

#### I. `entities.alertRules`

建议字段：

- `ruleId`
- `name`
- `enabled`
- `scopeConfig`
- `eventMatchConfig`
- `thresholdConfig`
- `dedupConfig`
- `notificationConfig`
- `templateSource?`
- `createdAt`
- `updatedAt`

#### J. `entities.connections`

建议字段：

- `connectionId`
- `connectionType`
- `name`
- `enabled`
- `status`
- `lastCheckAt?`
- `lastSuccessAt?`
- `lastErrorCode?`
- `lastErrorMessage?`
- `configSummary`
- `tags`

### 11.K.4 Indexes 详细约定（核心索引）

#### A. `eventIdsByRunId`

- 键：`runId`
- 值：按写入顺序保存 `eventId[]`
- 查询 `RunDetail` 时由 selector 再按 `sequence/time` 稳定排序

#### B. `alertIdsByRunId`

- 用于 `RunDetail` 快速展示关联告警
- 无关联时不创建空数组（减少噪音）

#### C. `runIdsByObjectKey`

推荐 key 规范：

- `workflow:{workflowId}`
- `job:{jobId}`

便于：

- `WorkflowDetail` / `JobDetail` 查询运行历史
- Dashboard 热点按对象聚合

#### D. `workflowVersionIdsByWorkflowId`

- 按版本创建时间排序
- `WorkflowDetail` 版本记录与回滚流程可直接消费

#### E. `connectionHealthChecksByConnectionId`

- 值类型：`ConnectionHealthCheckResult[]`
- v2.8 原型建议仅保留最近 N 条（如 20 条）

### 11.K.5 Selector 命名规范与分层

建议目录：

- `selectors/base/*`：只做字段读取与索引解析
- `selectors/derived/*`：做聚合统计与跨模块组合
- `selectors/view/*`：面向页面视图模型（可选）

#### A. Base Selectors（纯读取）

命名规范：

- `select<Entity>ById`
- `select<EntityPlural>`
- `select<IndexName>`

示例：

- `selectWorkflowById(state, workflowId)`
- `selectRunById(state, runId)`
- `selectAlertById(state, alertId)`
- `selectEventIdsByRunId(state, runId)`

#### B. Derived Selectors（组合与聚合）

命名规范：

- `select<Domain><Result>`
- `select<Domain><Metric>`

示例：

- `selectRunEvents(state, runId)`
- `selectRunAlerts(state, runId)`
- `selectWorkflowRuns(state, workflowId)`
- `selectDashboardKpis(state, timeRange)`
- `selectFailureHotspots(state, timeRange)`
- `selectConnectionImpactSummary(state, connectionId)`

#### C. View Selectors（页面视图模型，可选）

用于把多个实体拼成页面需要的结构，减少组件内拼装逻辑。

示例：

- `selectRunDetailViewModel(state, runId)`
- `selectAlertDrawerViewModel(state, alertId)`
- `selectWorkflowDetailHeaderViewModel(state, workflowId)`

### 11.K.6 Selector 设计约束（避免后期维护问题）

1. selector 不产生副作用
- 不写 store
- 不生成随机数/时间戳

2. selector 不吞掉错误语义
- 找不到实体时返回 `undefined/null`，由页面处理空态
- 不默认构造“假对象”

3. 聚合口径集中
- Dashboard KPI 公式只在 selector 中定义一份
- 避免页面重复实现 `strictSuccessRate` 计算

### 11.K.7 Action 命名规范与输入输出约定

建议将 action 分成两层：

1. 原子写入动作（`mutations`）
- 只负责写状态
- 不做复杂业务判定

2. 业务动作（`actions`）
- 串联多个写入动作
- 承载原型业务流程（触发运行、告警判定、连接测试）

原型阶段可以不显式拆两层目录，但语义上应保持区分。

#### A. 输入输出命名约定

- 输入：`<ActionName>Input`
- 输出：`<ActionName>Result`
- 上下文：`<ActionName>Context`（可选）

示例：

```ts
interface TriggerRunManualInput {
  objectType: "job" | "workflow";
  objectId: string;
  params: Record<string, unknown>;
  dryRun?: boolean;
  comment?: string;
  initiator: string;
}

interface TriggerRunManualResult {
  runId: string;
  createdEventIds: string[];
  generatedAlertIds?: string[];
}
```

#### B. Action 返回值约定

建议业务 action 返回结构化结果，而不是仅 `void`：

- 便于页面跳转（拿到 `runId`）
- 便于 toast 文案（生成告警数、是否部分成功）
- 便于后续接 API 时保持接口稳定

### 11.K.8 建议优先落地的业务 Actions（v2.8）

#### A. 运行与事件

- `triggerRunManual(input) => TriggerRunManualResult`
- `triggerRunRerun(input) => TriggerRunRerunResult`
- `appendRunEvent(input) => { eventId }`
- `completeRun(input) => { runId, finalStatus }`

#### B. 告警

- `evaluateAlertRulesForEvent(input) => { matchedRuleIds, generatedAlertIds }`
- `upsertAlertByDedupKey(input) => { alertId, merged: boolean }`
- `acknowledgeAlert(input) => { alertId, status }`
- `assignAlert(input) => { alertId, assignee }`
- `muteAlert(input) => { alertId, mutedUntil }`
- `resolveAlert(input) => { alertId, resolvedAt }`

#### C. 工作流编辑与版本

- `updateNodeConfig(input) => { workflowId, nodeId }`
- `saveWorkflowDraft(input) => { workflowId, draftVersionId }`
- `validateWorkflowDraft(input) => { workflowId, errors, warnings }`
- `publishWorkflow(input) => { workflowId, publishedVersionId }`

#### D. 连接探活

- `runConnectionHealthCheck(input) => { connectionId, status, eventIds, generatedAlertIds? }`
- `updateConnectionStatus(input) => { connectionId, status }`

### 11.K.9 Action 输入校验约定（原型期也要有）

即使是 mock store，也建议在业务 action 入口做基础校验：

1. 对象存在性校验
- `workflowId / jobId / runId / alertId / connectionId`

2. 枚举值校验
- `status / triggerType / eventType / joinPolicy`

3. 关键字段校验
- 手动触发参数必填项（基于参数 schema）
- 发布前版本存在性

4. 错误返回约定
- 抛异常或返回 `ok: false` 二选一
- v2.8 建议统一返回结构化错误对象，便于 UI 展示

示例：

```ts
interface ActionError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}
```

### 11.K.10 时间与 ID 生成约定（原型一致性）

为保持事件时间线与列表排序稳定，建议统一：

- 时间：统一使用 ISO 字符串（`new Date().toISOString()`）
- ID 前缀：
  - `WF-` / `JOB-` / `RUN-` / `EVT-` / `ALERT-` / `RULE-` / `CONN-`

事件序号建议：

- `sequence` 在同一 `runId` 内递增
- 由 `appendRunEvent` 统一分配

### 11.K.11 测试与调试辅助（原型开发效率项）

建议提供开发态辅助函数：

- `seedMockData(scenarioName)`
- `resetStore()`
- `rebuildIndexes()`
- `dumpRunTrace(runId)`

价值：

- 快速切换演示场景（success / partial_success / alert storm）
- 便于验证 selector 与页面联动是否正确

### 11.K.12 与未来真实 API 对接的迁移路径（前瞻）

v2.8 设计时就应为后续对接后端留接口：

1. 将业务 action 拆成：
- `prepareInput`（校验/补默认）
- `execute`（mock 或 API）
- `commitResult`（写 store）

2. 保持 selector 不变
- 页面层尽量只依赖 selector，减少切换成本

3. 将 `mock engine` 与 store actions 解耦
- 模拟运行逻辑（生成 RunEvent/Alert）可单独模块化

### 11.K.13 v2.8 实现优先级（原型）

1. `runs / runEvents / alerts / alertRules` 分片 + indexes + selectors（先打通运行告警闭环）
2. `triggerRunManual / evaluateAlertRulesForEvent / upsertAlertByDedupKey` 三个核心 actions
3. `workflows + workflowVersions + editorUi` 与 `save/publish/validate` actions
4. `connections + connectionHealthChecks` 与探活 action
5. 调试辅助函数（seed/reset/dump）

## 11.L NodeInspector 与 Settings「运行默认策略」字段映射表（回填 / 覆盖 / 保存语义）（v2.9）

> 本节用于打通 `Settings -> 运行默认策略` 与 `WorkflowEditor / NodeInspector` 的配置关系，明确哪些字段是“创建时回填默认值”、哪些支持对象级覆盖、哪些属于运行时计算值，避免后续实现出现“改了全局默认却误改历史节点配置”的问题。

### 11.L.1 设计目标

1. 明确字段来源
- 平台默认值（`Settings.runtimeDefaults`）
- 节点显式配置（`WorkflowNodeConfig`）
- 系统推导值（运行时或节点类型默认）

2. 明确覆盖语义
- 创建节点时回填
- 用户在 NodeInspector 修改后写入节点配置
- 修改 Settings 后不追溯覆盖已有节点

3. 明确 UI 表达方式
- 字段显示当前值
- 可标识“来自默认值 / 已覆盖”
- 支持“恢复默认值”（回到当前 Settings 默认值）

### 11.L.2 配置来源优先级（冻结规则）

节点执行相关字段的取值优先级建议固定为：

1. `NodeInspector` 已保存节点配置（最高优先）
2. `Workflow 模板/节点类型内建默认值`（如控制节点固定行为）
3. `Settings.runtimeDefaults`（平台默认值）
4. 系统兜底默认值（仅防御性使用，不作为产品可见配置）

说明：

- `Settings.runtimeDefaults` 主要用于“创建时回填”和“恢复默认值”
- 不应在运行时动态覆盖已保存节点配置

### 11.L.3 字段状态模型（建议 UI 与数据层统一）

对 NodeInspector 中受 Settings 影响的字段，建议维护以下 UI 状态：

- `effectiveValue`：当前生效值（展示与保存依据）
- `source`：`node_override | settings_default | system_default | fixed_by_type`
- `isOverridden`：是否已被节点显式覆盖
- `canResetToDefault`：是否允许恢复默认

用于前端展示：

- 字段旁显示 `默认` / `已覆盖` 标记
- “恢复默认值”按钮仅在 `isOverridden=true` 且存在 Settings 对应字段时出现

### 11.L.4 映射范围（v2.9）

本轮映射覆盖 `NodeInspector` 中最关键且与运行行为相关的字段：

1. 超时与执行策略
2. 重试策略
3. 失败动作
4. 并行汇聚默认策略
5. 手动触发相关默认项（说明其不属于 NodeInspector，但需界定边界）

### 11.L.5 字段映射总表（Settings -> NodeInspector）

#### A. 执行与超时类

| Settings 字段（runtimeDefaults） | NodeInspector 字段路径（WorkflowNodeConfig） | 回填时机 | 节点可覆盖 | 保存位置 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `defaultNodeTimeoutSec` | `execution.timeoutSec` | 新建执行节点时 | 是 | 节点配置 | 控制节点通常不显示 |
| `defaultRunTimeoutSec` | 无直接映射 | 不回填节点 | 否 | Run/对象级 | 属于对象或运行级，不属于节点 |
| `defaultPriority` | （v1 节点不落） | 不回填节点 | 否 | Run/Trigger/Schedule | NodeInspector 不展示 |

#### B. 重试策略类

| Settings 字段 | NodeInspector 字段路径 | 回填时机 | 节点可覆盖 | 保存位置 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `defaultRetryEnabled` | `retry.enabled` | 新建执行节点时 | 是 | 节点配置 | 控制节点一般不显示 |
| `defaultMaxAttempts` | `retry.maxAttempts` | 当 `retry.enabled=true` 时回填 | 是 | 节点配置 | 定义为“不含首次执行” |
| `defaultRetryIntervalType` | `retry.intervalType` | 新建执行节点时 | 是 | 节点配置 | `fixed / exponential` |
| `defaultRetryBaseIntervalSec` | `retry.baseIntervalSec` | 新建执行节点时 | 是 | 节点配置 | |
| `defaultRetryMaxIntervalSec` | `retry.maxIntervalSec` | `exponential` 时回填 | 是 | 节点配置 | `fixed` 时可隐藏但可保留值 |
| `defaultAfterRetryExhaustedAction` | `failure.afterRetryExhaustedAction` | 新建执行节点时 | 是 | 节点配置 | 建议默认 `terminate` |

#### C. 失败与告警类

| Settings 字段 | NodeInspector 字段路径 | 回填时机 | 节点可覆盖 | 保存位置 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `defaultAlertOnFailure` | `failure.alertOnFailure` | 新建执行节点时 | 是 | 节点配置 | 告警规则仍由 `AlertRules` 判定 |
| `defaultOnFailureAction` | `failure.onFailureAction` | 新建执行节点时 | 是 | 节点配置 | `terminate / skip / retry / compensate / continue_parallel` |

#### D. 汇聚策略类（仅汇聚节点）

| Settings 字段 | NodeInspector 字段路径 | 回填时机 | 节点可覆盖 | 保存位置 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `defaultJoinPolicy` | `join.joinPolicy` | 新建汇聚节点时 | 是 | 节点配置 | 默认 `all_success` |

### 11.L.6 不在 NodeInspector 的字段（边界明确）

以下 `Settings.runtimeDefaults` 字段不建议映射到 NodeInspector，应在其他页面/模块消费：

1. `defaultRunTimeoutSec`
- 更适合 `Workflow / Job` 对象级配置或 `RunTriggerDialog` 执行选项

2. `defaultPriority`
- 更适合 `RunTriggerDialog`、`ScheduleEdit`、`TriggerDetail` 执行选项

3. `defaultDryRunVisible`
- 仅影响 `RunTriggerDialog` UI 显示策略

4. `defaultCommentRequired`
- 仅影响 `RunTriggerDialog` 表单校验

### 11.L.7 创建节点时的回填规则（关键流程）

#### A. 新建执行节点（如 SQL / Python / 存储过程）

创建节点时建议执行：

1. 根据节点类型生成最小 `WorkflowNodeConfig`
2. 读取 `Settings.runtimeDefaults`
3. 回填执行/重试/失败动作相关字段
4. 标记这些字段来源为 `settings_default`

示例结果（概念）：

```ts
{
  execution: { timeoutSec: 1800 },
  retry: {
    enabled: true,
    maxAttempts: 3,
    intervalType: "fixed",
    baseIntervalSec: 300
  },
  failure: {
    onFailureAction: "terminate",
    afterRetryExhaustedAction: "terminate",
    alertOnFailure: true
  }
}
```

#### B. 新建汇聚节点（Join）

创建汇聚节点时建议执行：

1. 填充 `join.joinPolicy = Settings.defaultJoinPolicy`
2. 标记来源 `settings_default`
3. 若节点类型固定要求某策略，则来源改为 `fixed_by_type`

### 11.L.8 NodeInspector 编辑时的覆盖与保存规则

#### A. 用户修改字段

当用户在 NodeInspector 修改受 Settings 影响字段时：

1. 更新 `draftConfig` 对应字段值
2. 将字段来源标记为 `node_override`
3. `isOverridden = true`
4. 保存节点时写入 `WorkflowNodeConfig`

#### B. 用户点击“恢复默认值”

建议交互语义：

1. 读取当前 `Settings.runtimeDefaults` 对应字段
2. 覆盖 `draftConfig` 字段值
3. 将字段来源改为 `settings_default`
4. 若字段值与节点显式存储策略一致：
   - v2.9 原型可保留字段值并仅更新来源
   - 后续可优化为“删除节点显式值，回退到继承模式”

### 11.L.9 Settings 变更后的影响范围（必须明确）

当用户修改 `Settings.runtimeDefaults` 并保存后：

1. 立即影响
- 后续新建节点的默认回填值
- NodeInspector 中“恢复默认值”按钮恢复到的新目标值
- 其他使用默认值回填的创建/弹窗场景

2. 不立即影响
- 已保存的历史节点配置
- 已发布工作流版本中的节点配置
- 已创建的 Run / 历史事件 / 历史告警

建议在 Settings 页面提示文案中明确此规则，避免误解。

### 11.L.10 NodeInspector UI 表达建议（与 10.0.10.A 配套）

对受 Settings 影响字段，建议在表单项右侧增加轻量标识：

- `默认`（来源 `settings_default`）
- `已覆盖`（来源 `node_override`）
- `固定`（来源 `fixed_by_type`）

可选交互：

- 悬浮提示展示“当前值来源”
- `恢复默认值` 文本按钮（不建议放太重按钮样式）

### 11.L.11 数据结构建议（原型级实现方案）

为避免污染最终 `WorkflowNodeConfig`，建议字段来源状态仅存在于编辑器 UI 态（如 `workflowEditorUi`）中，而不是写入发布版本数据。

建议结构（概念）：

```ts
interface NodeFieldSourceState {
  path: string; // e.g. "retry.maxAttempts"
  source: "settings_default" | "node_override" | "fixed_by_type" | "system_default";
  isOverridden: boolean;
}

type NodeFieldSourceMap = Record<string, NodeFieldSourceState>;
```

存放位置建议：

- `ui.workflowEditor.nodeFieldSourcesByNodeId[nodeId]`

### 11.L.12 与 mock store / actions 的联动点（落地建议）

建议在 `11.K` 的 actions 基础上补充或约定以下行为：

1. `createWorkflowNode`
- 创建节点并根据 `Settings.runtimeDefaults` 回填配置
- 初始化字段来源映射

2. `updateNodeConfig`
- 支持传入 `sourceMeta`（可选）
- 更新 `draftConfig` 与 `nodeFieldSourcesByNodeId`

3. `resetNodeFieldToDefault`
- 按字段路径读取 Settings 默认值并回填
- 更新字段来源状态

4. `applyRuntimeDefaultsPreview`（可选）
- 仅用于 UI 展示“如果恢复默认将变成什么值”

### 11.L.13 测试用例建议（原型逻辑校验）

建议至少覆盖以下用例（即使是轻量单元测试或手工验证脚本）：

1. 新建节点后重试字段正确来自 Settings 默认值
2. 用户改 `retry.maxAttempts` 后来源变为 `node_override`
3. 点击“恢复默认值”后值与来源恢复为 `settings_default`
4. 修改 Settings 默认值后，旧节点配置不变
5. 修改 Settings 默认值后，新建节点回填新值
6. 汇聚节点正确使用 `defaultJoinPolicy`

### 11.L.14 v2.9 实现优先级（原型）

1. 落地映射表涉及字段的创建时回填逻辑（执行节点 + 汇聚节点）
2. NodeInspector 字段来源标识（`默认/已覆盖`）
3. “恢复默认值”按钮（至少支持重试与失败动作字段）
4. Settings 保存后影响新建节点、但不影响历史节点的规则验证

## 11.M RunTriggerDialog 与 Settings「运行默认策略」字段映射表（显示 / 回填 / 校验语义）（v3.0）

> 本节用于打通 `Settings.runtimeDefaults` 与 `RunTriggerDialog`（手动触发弹窗）的字段关系，明确“哪些是 UI 可见性控制、哪些是默认值回填、哪些是表单校验规则”，避免触发弹窗在不同页面入口行为不一致。

### 11.M.1 设计目标

1. 统一弹窗行为
- `JobsList / JobDetail / WorkflowsList / WorkflowDetail / RunDetail(重跑)` 打开同一套触发弹窗时，默认值与校验一致

2. 明确来源与覆盖优先级
- 平台默认值（Settings）
- 页面入口上下文（如重跑回填）
- 用户本次输入（最终优先）

3. 明确“显示策略”与“业务值”区别
- `dryRunVisible` 影响字段是否展示
- `commentRequired` 影响校验规则
- `defaultPriority` 影响初始值

### 11.M.2 配置来源优先级（RunTriggerDialog）

弹窗字段最终值/行为建议按以下优先级确定：

1. 入口上下文显式指定（最高优先）
- 例如 `RunDetail -> 重跑` 传入 `initialParams / initialComment / lockDryRun`

2. 用户上次在当前弹窗中的本次编辑（弹窗打开期间）

3. `Settings.runtimeDefaults`
- `defaultPriority`
- `defaultDryRunVisible`
- `defaultCommentRequired`

4. 系统兜底默认
- `priority = normal`
- `dryRun = false`
- `comment = ""`

说明：

- 与 NodeInspector 一样，修改 Settings 不应影响“已提交的历史 Run”
- 仅影响后续打开弹窗的初始状态与校验规则

### 11.M.3 映射范围（v3.0）

本轮映射覆盖以下 RunTriggerDialog 相关项：

1. 字段显示策略
- `dryRun` 是否显示

2. 字段默认值
- `priority`
- `comment`（是否预填可选）
- `dryRun` 初始值（如后续需要）

3. 校验规则
- `comment` 是否必填

4. 边界项
- `defaultRunTimeoutSec`（不在 v3.0 弹窗字段中，但需说明去向）

### 11.M.4 字段映射总表（Settings -> RunTriggerDialog）

| Settings 字段（runtimeDefaults） | RunTriggerDialog 字段/行为 | 类型 | 作用方式 | 用户可覆盖 | 保存到哪里 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| `defaultPriority` | `form.priority` | 默认值 | 打开弹窗时回填 | 是 | `Run.triggerOptions` / `Run` 扩展字段 | v1 可先隐藏 UI，但保留数据结构 |
| `defaultDryRunVisible` | `ui.fieldVisibility.dryRun` | 显示策略 | 控制字段是否展示 | 否（管理员通过 Settings 控制） | UI 状态 | 仅控制展示，不等于 `dryRun=true` |
| `defaultCommentRequired` | `validation.comment.required` | 校验策略 | 决定 comment 是否必填 | 否（由 Settings/入口上下文控制） | UI 校验规则 | 建议支持入口覆盖（如重跑强制填写说明） |
| `defaultRunTimeoutSec` | 无直接映射（v3.0） | 非弹窗字段 | 不在当前弹窗展示 | - | 对象级/运行引擎配置 | 可后续扩展到高级选项 |

### 11.M.5 RunTriggerDialog 字段状态模型（建议）

建议将弹窗状态拆成三层：

1. `formDraft`（用户输入值）
- `params`
- `dryRun`
- `priority`
- `comment`

2. `uiPolicy`（来自 Settings / 入口上下文）
- `fieldVisibility`
- `fieldRequired`
- `fieldDisabled`

3. `effectiveConfig`（提交前合成结果）
- 将 `formDraft` 与 `uiPolicy`、入口上下文合成后用于校验与提交

示例（概念）：

```ts
interface RunTriggerDialogUiPolicy {
  fieldVisibility: {
    dryRun: boolean;
    priority: boolean;
    comment: boolean;
  };
  fieldRequired: {
    comment: boolean;
  };
  fieldDisabled: {
    dryRun?: boolean;
    priority?: boolean;
  };
}
```

### 11.M.6 打开弹窗时的回填规则（按入口）

#### A. 从 Job/Workflow 详情页点击“运行一次”

回填顺序建议：

1. 读取对象参数 schema，生成 `params` 初始表单
2. 读取 `Settings.runtimeDefaults`
3. 应用：
- `priority = defaultPriority`
- `dryRun` 字段显示策略（由 `defaultDryRunVisible` 控制）
- `comment` 是否必填（由 `defaultCommentRequired` 控制）
4. 设置 `comment = ""`

#### B. 从 RunDetail 点击“重跑”

重跑场景建议新增入口上下文覆盖：

1. `params` 默认回填上一条 Run 的参数快照
2. `comment` 默认可预填（如 `重跑 RUN-1234`，用户可编辑）
3. 如平台策略要求重跑必须说明原因：
- 入口上下文可强制 `commentRequired = true`

说明：

- 入口上下文覆盖优先于 Settings 默认值
- 但仍不修改 Settings 全局配置

### 11.M.7 `dryRunVisible` 的精确定义（避免误解）

`defaultDryRunVisible` 的推荐语义：

- `true`：在 RunTriggerDialog 展示 `dryRun` 开关，默认值可由入口或系统决定（通常 `false`）
- `false`：隐藏 `dryRun` 开关，并在提交时固定使用 `dryRun=false`

不建议的语义（避免）：

- 把 `defaultDryRunVisible=false` 理解成“禁用 dryRun 功能且强制报错”

可扩展（后续）：

- `defaultDryRunEnabledByDefault`（控制初始值，而不是显示）

### 11.M.8 `commentRequired` 的校验语义（建议冻结）

`defaultCommentRequired` 仅控制 UI 校验规则，不影响后端业务语义（原型阶段）。

建议校验规则：

1. 若 `commentRequired=true`
- `comment.trim().length > 0`

2. 若入口上下文指定更强规则（如重跑）
- 入口上下文优先

3. 失败提示文案（建议统一）
- `请填写触发说明`

可扩展（后续）：

- 最小长度限制
- 敏感词过滤
- 审计原因模板

### 11.M.9 `priority` 的展示与保存策略（v3.0）

考虑到原型复杂度，建议分阶段：

1. v3.0（当前）
- 数据结构中保留 `priority`
- UI 可先隐藏或放入“高级选项”
- 提交时写入 `Run.triggerOptions.priority`（或 `Run` 扩展字段）

2. 后续增强
- 在队列页按 `priority` 排序展示
- 支持 `high` 优先级的可视化标记

### 11.M.10 不在 v3.0 弹窗范围内的运行默认项（边界）

以下 Settings 字段不建议直接进入 RunTriggerDialog 主表单：

1. `defaultNodeTimeoutSec`
- 属于节点/工作流配置层，不是手动触发参数

2. 重试相关默认值
- 属于对象运行策略（Node/Workflow），不在本次手动触发表单中编辑

3. `defaultOnFailureAction` / `defaultJoinPolicy`
- 属于工作流节点配置，不属于本次运行输入

### 11.M.11 与 `11.K mock store actions` 的联动建议

建议在 `11.K` 的 action 规格基础上明确：

1. `openRunTriggerDialog(input)`
- 读取 Settings 默认值
- 根据入口类型构建 `uiPolicy`
- 初始化 `formDraft`

2. `updateRunTriggerDialogField(input)`
- 更新 `formDraft`
- 保留 `uiPolicy` 不变

3. `validateRunTriggerDialog(input)`
- 按 `uiPolicy.fieldRequired` + 参数 schema 校验
- 返回结构化 `fieldErrors`

4. `submitRunTriggerDialog(input)`
- 先校验
- 合成 `TriggerRunManualInput`
- 调用 `triggerRunManual` 或 `triggerRunRerun`

### 11.M.12 建议数据结构（原型级）

```ts
interface RunTriggerDialogState {
  open: boolean;
  mode: "manual_run" | "rerun";
  sourceType: "job" | "workflow" | "run";
  targetObjectType?: "job" | "workflow";
  targetObjectId?: string;
  sourceRunId?: string;
  formDraft: {
    params: Record<string, unknown>;
    dryRun: boolean;
    priority: "low" | "normal" | "high";
    comment: string;
  };
  uiPolicy: RunTriggerDialogUiPolicy;
  validationErrors: Record<string, string>;
  submitState: "idle" | "validating" | "submitting" | "submit_failed";
}
```

### 11.M.13 测试用例建议（原型逻辑）

建议至少覆盖以下场景：

1. Settings `defaultDryRunVisible=false` 时隐藏 `dryRun` 字段且提交 `dryRun=false`
2. Settings `defaultCommentRequired=true` 时未填说明无法提交
3. 重跑入口强制 `commentRequired=true` 能覆盖 Settings 默认值
4. Settings `defaultPriority=high` 时弹窗初始 `priority=high`
5. 修改 Settings 后重新打开弹窗，默认值更新；已打开弹窗不被强制覆盖

### 11.M.14 v3.0 实现优先级（原型）

1. `defaultDryRunVisible` 与 `defaultCommentRequired` 的 UIPolicy 回填与校验
2. `defaultPriority` 的数据结构回填（UI 可先隐藏）
3. 重跑入口上下文覆盖（参数与 commentRequired）
4. `open/validate/submit RunTriggerDialog` actions 与 `triggerRunManual` 联动

## 11.N Settings.runtimeDefaults 在 ScheduleEdit / TriggerDetail 的字段映射表（触发入口侧默认值与覆盖语义）（v3.1）

> 本节用于统一“触发入口侧配置”（`ScheduleEdit`、`TriggerDetail`）对 `Settings.runtimeDefaults` 的消费方式，确保手动触发、定时触发、Webhook/Upstream 触发在默认执行选项上的口径一致。

### 11.N.1 设计目标

1. 统一触发入口默认值
- `RunTriggerDialog`（手动触发）
- `ScheduleEdit`（定时触发）
- `TriggerDetail`（Webhook/Upstream）

2. 明确配置分层
- `Settings.runtimeDefaults` 提供平台级默认值
- `Schedule/Trigger` 保存对象级覆盖配置
- 实际触发生成 `Run` 时按优先级合成最终执行选项

3. 明确“触发入口侧”与“对象运行策略”的边界
- 触发入口侧主要关心：优先级、是否 dry-run（测试触发场景）、触发说明/审计信息
- 不直接编辑节点级重试/失败动作/汇聚策略

### 11.N.2 配置来源优先级（触发入口侧）

当 `Schedule` 或 `Trigger` 触发生成 `Run` 时，执行选项建议按以下优先级确定：

1. 触发入口对象显式配置（`Schedule.triggerOptions` / `Trigger.triggerOptions`）
2. 触发动作上下文（如 Trigger 测试触发临时选项）
3. `Settings.runtimeDefaults`
4. 系统兜底默认

说明：

- `Workflow / Job` 节点级运行策略（如重试、失败动作）仍由对象配置决定，不在本节覆盖
- 本节只定义“触发入口侧执行选项”的默认值与覆盖规则

### 11.N.3 触发入口侧建议统一模型（TriggerOptions）

建议 `Schedule` 与 `Trigger` 共享一套可选触发执行配置模型（原型级）：

```ts
interface TriggerExecutionOptions {
  priority?: "low" | "normal" | "high";
  commentTemplate?: string;
  dryRunForTestOnly?: boolean; // 仅测试触发使用，不用于正式触发
}
```

补充说明：

- `dryRunForTestOnly` 只适用于 `TriggerDetail` 的“发送测试 Payload / 测试触发”
- 正式 `Schedule` 执行不建议长期保存 `dryRun=true`

### 11.N.4 字段映射总表（Settings -> ScheduleEdit / TriggerDetail）

#### A. `defaultPriority`

| Settings 字段 | ScheduleEdit 映射 | TriggerDetail 映射 | 作用方式 | 可覆盖 | 保存位置 |
| --- | --- | --- | --- | --- | --- |
| `defaultPriority` | `schedule.triggerOptions.priority` | `trigger.triggerOptions.priority` | 新建时回填默认优先级 | 是 | `Schedule/Trigger` 对象配置 |

说明：

- `ScheduleEdit` 中建议作为“高级执行选项”
- `TriggerDetail` 中建议作为“触发执行默认选项”
- 若未配置对象级值，则运行时回落到 `Settings.defaultPriority`

#### B. `defaultCommentRequired`

| Settings 字段 | ScheduleEdit 映射 | TriggerDetail 映射 | 作用方式 | 可覆盖 | 保存位置 |
| --- | --- | --- | --- | --- | --- |
| `defaultCommentRequired` | 无直接映射（正式定时触发通常不要求人工说明） | `TriggerDetail` 测试触发表单 `comment` 校验规则 | 控制测试触发时 comment 是否必填 | Trigger 测试上下文可覆盖 | UI 状态（不写 Trigger 对象） |

说明：

- `ScheduleEdit` 场景一般是系统自动触发，不适合使用“人工触发说明必填”
- `TriggerDetail` 的“测试触发”属于人工操作，适合复用该规则

#### C. `defaultDryRunVisible`

| Settings 字段 | ScheduleEdit 映射 | TriggerDetail 映射 | 作用方式 | 可覆盖 | 保存位置 |
| --- | --- | --- | --- | --- | --- |
| `defaultDryRunVisible` | 无直接映射（Schedule 不建议提供 dry-run 开关） | `TriggerDetail` 测试触发表单 `dryRun` 字段显示策略 | 控制测试触发时是否展示 dry-run 开关 | Trigger 测试上下文可覆盖 | UI 状态（不写 Trigger 对象） |

说明：

- `TriggerDetail` 的“实际触发”按钮不应依赖该字段，始终是实际触发
- `dryRun` 仅用于“测试触发”模式

#### D. `defaultRunTimeoutSec`

| Settings 字段 | ScheduleEdit 映射 | TriggerDetail 映射 | 作用方式 | 可覆盖 | 保存位置 |
| --- | --- | --- | --- | --- | --- |
| `defaultRunTimeoutSec` | 可选映射到 `schedule.triggerOptions.runTimeoutSec`（后续） | 可选映射到 `trigger.triggerOptions.runTimeoutSec`（后续） | v3.1 暂不落地 | 后续 | 暂无 |

说明：

- v3.1 原型暂不在触发入口编辑运行超时，避免与对象级超时策略混淆

### 11.N.5 ScheduleEdit 页面映射与交互规则

#### A. 页面定位（与 Settings 的关系）

`ScheduleEdit` 应重点配置：

- 调度时间策略（cron/interval/calendar）
- 绑定对象（Job/Workflow）
- 参数映射
- 触发执行选项（高级）

其中“触发执行选项（高级）”与 `Settings.runtimeDefaults` 有映射关系。

#### B. 建议字段分组（高级执行选项）

v3.1 建议仅包含：

- `priority`（默认来自 `Settings.defaultPriority`）
- `commentTemplate`（可选，不由 Settings 默认值直接控制）

说明：

- `commentTemplate` 用于系统触发时生成审计说明，如 `schedule:{name}`
- 不等同于人工 comment 输入框

#### C. 回填与保存语义

1. 新建 Schedule
- 若用户未设置 `priority`，UI 展示默认值（来自 Settings）
- 保存时可选择：
  - 写入对象显式值（原型推荐，简单）
  - 或不写入，运行时继承（后续优化）

2. 编辑已有 Schedule
- 优先读取对象已保存值
- 无对象值时回落显示 Settings 默认值

### 11.N.6 TriggerDetail 页面映射与交互规则

#### A. Trigger 配置页中的两个场景（必须区分）

1. Trigger 对象配置（持久配置）
- 绑定对象
- 参数映射
- 安全配置
- 默认执行选项（如 `priority`）

2. Trigger 测试触发（临时操作）
- 测试 Payload
- `dryRun`（可见性受 Settings 控制）
- `comment`（是否必填受 Settings 控制）

#### B. Trigger 对象配置（持久）字段映射

建议映射：

- `Settings.defaultPriority -> trigger.triggerOptions.priority`（新建 Trigger 时回填）

不建议持久映射：

- `defaultDryRunVisible`
- `defaultCommentRequired`

原因：

- 这两个是“人工测试触发 UI 行为策略”，不是 Trigger 实际业务配置

#### C. 测试触发表单（临时）字段映射

从 `Settings.runtimeDefaults` 映射到 Trigger 测试 UI：

- `defaultDryRunVisible -> testTriggerDialog.uiPolicy.fieldVisibility.dryRun`
- `defaultCommentRequired -> testTriggerDialog.uiPolicy.fieldRequired.comment`
- `defaultPriority -> testTriggerDialog.formDraft.priority`（若测试触发允许设置 priority）

### 11.N.7 运行时执行选项合成规则（Schedule/Trigger -> Run）

为统一不同入口生成 Run 的行为，建议定义合成函数（概念）：

```ts
resolveTriggerExecutionOptions({
  runtimeDefaults,
  objectTriggerOptions,   // schedule.triggerOptions or trigger.triggerOptions
  invocationOverrides,    // test trigger / manual override
})
```

合成结果可用于构造：

- `Run.triggerType`
- `Run.triggerOptions`（扩展字段，原型可选）
- 触发说明（写入 `Run.params` 或 `Run.context` 的审计字段）

### 11.N.8 与 `RunTriggerDialog` 的一致性约定（关键）

为避免“手动触发”和“触发器测试”行为不一致，建议统一以下规则：

1. `defaultDryRunVisible`
- 同样只控制 UI 显示，不控制默认值 true/false

2. `defaultCommentRequired`
- 同样只控制人工触发类表单校验（手动触发 / 测试触发）

3. `defaultPriority`
- 均作为初始值回填，但允许页面上下文覆盖

### 11.N.9 数据结构建议（原型级）

#### A. `Schedule` / `Trigger` 对象扩展（持久配置）

```ts
interface TriggerExecutionOptionsPersisted {
  priority?: "low" | "normal" | "high";
  commentTemplate?: string;
}
```

#### B. `TriggerDetail` 测试触发 UI 状态（临时）

```ts
interface TriggerTestDialogState {
  open: boolean;
  triggerId: string;
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
```

### 11.N.10 与 `11.K mock store actions` 的联动建议

建议新增或细化以下 actions：

1. `openScheduleEdit(input)`
- 回填 `priority` 默认值（若对象未设置）

2. `openTriggerDetailTestDialog(input)`
- 读取 `Settings.runtimeDefaults`
- 初始化测试触发 `uiPolicy` 与 `formDraft`

3. `validateTriggerTestDialog(input)`
- 校验 Payload + comment（若 required）

4. `submitTriggerTest(input)`
- 支持 `validate_only` 与 `trigger_run`
- `trigger_run` 时生成 `Run / RunEvent`

5. `resolveTriggerExecutionOptions(input)`
- 被 `submitTriggerTest`、Schedule 执行模拟、Trigger 实际触发共用

### 11.N.11 测试用例建议（原型逻辑）

建议至少覆盖以下场景：

1. 新建 Schedule 时 `priority` 默认来自 Settings
2. 已保存 Schedule 的 `priority` 不受 Settings 变更回写影响
3. Trigger 测试触发时 `dryRun` 字段显示受 `defaultDryRunVisible` 控制
4. Trigger 测试触发时 `commentRequired` 规则生效
5. Trigger 实际触发不受 `dryRunVisible/commentRequired` 的 UI 规则干扰
6. `resolveTriggerExecutionOptions` 在 Schedule/Trigger/测试触发三类入口产出一致口径

### 11.N.12 v3.1 实现优先级（原型）

1. `ScheduleEdit` 高级执行选项中的 `priority` 默认值回填
2. `TriggerDetail` 测试触发 UI 的 `dryRunVisible/commentRequired` 策略回填
3. `resolveTriggerExecutionOptions` 工具函数/selector 落地
4. `submitTriggerTest` 与 `Run / RunEvent` 联动（validate_only + trigger_run）

## 11.O Settings.runtimeDefaults 默认值继承与覆盖总览（文字版）（v3.2）

> 本节用于把 `11.L / 11.M / 11.N` 中分散的默认值继承规则收敛成一份“开发对照总览”，帮助前端实现时快速判断某个字段应从哪里取值、何时回填、是否可覆盖、改动后影响哪些对象。

### 11.O.1 适用范围与前提

本总览只覆盖 `Settings.runtimeDefaults` 的消费链路，不覆盖：

- 登录 / 工作空间（当前明确暂不考虑）
- RBAC 权限校验细则（仅保留概念）
- 后端真实配置中心同步冲突

当前假设：

- 单工作空间 / 单租户视角
- Settings 为平台级单例配置
- 历史对象配置不被 Settings 变更回写

### 11.O.2 默认值继承总原则（冻结）

1. Settings 默认值用于“创建时回填”和“恢复默认值”
- 不是运行时强覆盖器

2. 对象级显式配置优先于 Settings 默认值
- Node / Schedule / Trigger / Dialog 上下文一旦保存或显式指定，即优先使用显式值

3. Settings 修改后不回写历史配置
- 仅影响后续新建对象
- 仅影响“恢复默认值”操作目标值
- 仅影响后续新打开的临时弹窗初始状态

4. UI 显示策略与业务执行值要分开
- 例如 `defaultDryRunVisible` 是“是否展示字段”，不是“业务默认 dryRun=true”

### 11.O.3 默认值消费对象分层（总图文字版）

建议从“消费层级”理解 `runtimeDefaults`：

1. 节点配置层（Workflow 编辑期）
- 消费方：`NodeInspector` / `createWorkflowNode`
- 代表字段：`timeout / retry / failureAction / joinPolicy`
- 输出：写入 `WorkflowNodeConfig`

2. 手动触发层（人工触发临时表单）
- 消费方：`RunTriggerDialog`
- 代表字段：`priority / dryRunVisible / commentRequired`
- 输出：生成一次 `TriggerRunManualInput`（临时，不写对象配置）

3. 触发入口配置层（Schedule/Trigger 对象配置）
- 消费方：`ScheduleEdit` / `TriggerDetail`
- 代表字段：`priority`（持久化）、测试触发 UI 策略（临时）
- 输出：`Schedule.triggerOptions` / `Trigger.triggerOptions` + 测试弹窗临时状态

4. 对象展示与编辑辅助层（WorkflowDetail / JobEdit / JobDetail）
- 消费方：详情页/编辑页的默认值展示、创建时回填、重置动作
- 代表字段：对象级默认超时/重试建议（详见 `11.P`）
- 输出：对象级配置或说明性展示，不直接替代节点配置

### 11.O.4 字段分类法（建议实现时先分类再映射）

将 `runtimeDefaults` 字段按“影响对象类型”分为三类：

#### A. 节点策略类（Node-level）

典型字段：

- `defaultNodeTimeoutSec`
- `defaultRetryEnabled`
- `defaultMaxAttempts`
- `defaultRetryIntervalType`
- `defaultRetryBaseIntervalSec`
- `defaultRetryMaxIntervalSec`
- `defaultAfterRetryExhaustedAction`
- `defaultAlertOnFailure`
- `defaultOnFailureAction`
- `defaultJoinPolicy`

主要消费方：

- `createWorkflowNode`
- `NodeInspector`（恢复默认）

#### B. 触发入口类（Trigger-entry-level）

典型字段：

- `defaultPriority`
- `defaultDryRunVisible`
- `defaultCommentRequired`

主要消费方：

- `RunTriggerDialog`
- `TriggerDetail` 测试触发 UI
- `ScheduleEdit` / `TriggerDetail` 高级执行选项（`priority`）

#### C. 运行/对象级预留类（Run/Object-level, deferred）

典型字段：

- `defaultRunTimeoutSec`

说明：

- 当前在 v3.2 中明确“暂不大面积落地到弹窗/触发入口”
- 后续可在 `Workflow/Job` 对象级执行策略或运行引擎配置中启用

### 11.O.5 五类“取值时机”总览（开发实现要点）

1. 创建对象/节点时取值
- 例如新建执行节点、新建 Schedule、新建 Trigger
- 从 Settings 回填初始值

2. 打开临时弹窗时取值
- 例如 `RunTriggerDialog`、Trigger 测试触发
- 只影响当前弹窗初始 UI 状态与校验策略

3. 编辑已有对象时取值
- 优先对象显式配置
- 没有显式值时才显示 Settings 默认值（可作为占位/建议）

4. 用户点击“恢复默认值”时取值
- 实时读取当前 Settings 值
- 不用历史快照

5. 运行时合成执行选项时取值
- 使用对象显式配置 + 触发上下文 + Settings 默认值进行合成
- 通过统一函数/selector 处理（例如 `resolveTriggerExecutionOptions`）

### 11.O.6 统一优先级模板（可复用到各模块）

建议实现层提供一个可复用的“优先级决策模板”：

```ts
effective = explicitValue ?? contextOverride ?? settingsDefault ?? systemFallback
```

不同模块的差异主要在：

- 是否存在 `contextOverride`
- `explicitValue` 保存在哪个对象（Node / Schedule / Trigger / Dialog state）
- 结果是“写入对象”还是“仅用于一次性提交”

### 11.O.7 Settings 变更影响矩阵（总览）

#### A. 会立即受到影响

- 新建节点时的默认重试/失败动作/超时
- 新开 `RunTriggerDialog` 的字段显示与校验策略
- 新建 Schedule/Trigger 的默认 `priority`
- Trigger 测试触发表单的 UI 策略（新打开）

#### B. 不会立即受到影响

- 已保存 Workflow 节点配置
- 已保存 Schedule / Trigger 对象配置
- 已打开但尚未关闭的弹窗（建议不强制热更新）
- 历史 Run / RunEvent / Alert

### 11.O.8 开发落地建议（避免重复实现）

1. 将 Settings 默认值读取封装为 selector
- 如 `selectRuntimeDefaults(state)`

2. 将“回填逻辑”与“运行时合成逻辑”分开
- 回填逻辑用于创建/打开表单
- 合成逻辑用于提交前/触发前计算

3. 将“字段来源状态”限制在 UI 层
- 尤其是 NodeInspector 的 `默认/已覆盖` 标签来源状态

4. 用统一错误码/字段名输出校验错误
- 避免不同弹窗对同一字段给出不同错误键名

### 11.O.9 与相关章节的对应关系（索引）

- 节点侧映射：见 `11.L`
- 手动触发弹窗映射：见 `11.M`
- Schedule/Trigger 触发入口映射：见 `11.N`
- mock store 实现规格：见 `11.K`
- Settings 模块定义：见 `11.J`

### 11.O.10 v3.2 实现优先级（总览落地）

1. 统一 `selectRuntimeDefaults` selector
2. 统一 `resolveTriggerExecutionOptions`（触发入口合成）
3. 统一 `createWorkflowNode` 的默认值回填逻辑
4. 给 `RunTriggerDialog` / Trigger 测试弹窗实现一致的 UI 策略初始化

## 11.P Settings.runtimeDefaults 在 WorkflowDetail / JobEdit / JobDetail 的映射边界与交互细化（v3.2）

> 本节用于补齐“对象页面层”对 `Settings.runtimeDefaults` 的消费边界，重点解决：哪些字段用于创建时回填、哪些仅用于提示/建议、哪些不应在详情页直接编辑，以避免对象级配置与节点级配置冲突。

### 11.P.1 设计目标

1. 明确对象页面层职责
- `WorkflowDetail` 偏查看、触发、版本与运行联动
- `JobEdit` 偏对象配置编辑
- `JobDetail` 偏查看、运行与依赖关系

2. 明确 Settings 默认值在对象页面层的作用方式
- 作为创建/编辑表单默认值来源
- 作为“建议值 / 说明信息”
- 作为“恢复默认”目标值（仅对象级字段）

3. 避免越权编辑
- 不在 `WorkflowDetail`/`JobDetail` 直接编辑本应在 `NodeInspector` 编辑的节点级策略

### 11.P.2 总体边界（先定清楚）

`Settings.runtimeDefaults` 在对象页面层的使用原则：

1. `WorkflowDetail`
- 主要用于展示“平台默认策略参考”与试运行入口行为一致性
- 不直接批量改写工作流内节点策略

2. `JobEdit`
- 可用于回填对象级执行默认值（如对象级超时、对象级重试建议，若页面存在这些字段）
- 不替代特定 jobType 的业务配置字段

3. `JobDetail`
- 主要用于展示与运行入口（RunTriggerDialog）联动
- 不作为 Settings 的主要编辑消费面

### 11.P.3 WorkflowDetail 的映射边界（查看页）

#### A. 建议展示但不直接编辑的默认策略信息

在 `WorkflowDetail` 中可增加“运行策略摘要（只读）”卡片，展示：

- 平台默认节点超时（`defaultNodeTimeoutSec`）
- 平台默认重试次数（`defaultMaxAttempts`）
- 平台默认失败动作（`defaultOnFailureAction`）
- 平台默认汇聚策略（`defaultJoinPolicy`）

用途：

- 帮助使用者理解“新建节点为什么默认是这个值”
- 作为编辑器行为的背景说明

#### B. 不建议直接映射到 WorkflowDetail 可编辑字段的项

以下字段不建议在 `WorkflowDetail` 顶部直接编辑：

- 节点级重试配置
- 节点级失败动作
- 节点级补偿策略
- 节点级 joinPolicy

原因：

- 这些属于 `WorkflowEditor / NodeInspector` 的职责范围
- 在详情页暴露会造成“对象级 vs 节点级”语义混淆

#### C. 与“试运行 / 手动触发”入口的联动

`WorkflowDetail` 的“运行一次”按钮打开 `RunTriggerDialog` 时，应复用 `11.M` 映射规则：

- `defaultPriority`
- `defaultDryRunVisible`
- `defaultCommentRequired`

因此 `WorkflowDetail` 不需要重复定义这些字段逻辑。

### 11.P.4 JobEdit 的映射边界（编辑页，核心）

#### A. JobEdit 可能存在的两类字段

1. 业务定义字段（由 jobType 决定）
- SQL 文本 / 存储过程名 / Python 脚本路径 / SQL Agent Job 名称
- 连接配置 / 参数映射 / 输出配置

2. 执行策略字段（对象级）
- 超时
- 重试
- 失败是否告警（对象级）

`Settings.runtimeDefaults` 主要映射到第 2 类字段。

#### B. 建议映射字段（若 JobEdit 页面提供对象级执行策略）

| Settings 字段 | JobEdit 字段路径（建议） | 回填时机 | 可覆盖 | 保存语义 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `defaultNodeTimeoutSec` | `job.runtimePolicy.timeoutSec` | 新建 Job 时 | 是 | 保存到 Job 对象 | Job 作为执行单元可复用节点级默认超时 |
| `defaultRetryEnabled` | `job.runtimePolicy.retry.enabled` | 新建 Job 时 | 是 | 保存到 Job 对象 | |
| `defaultMaxAttempts` | `job.runtimePolicy.retry.maxAttempts` | 新建 Job 时 | 是 | 保存到 Job 对象 | 定义为不含首次 |
| `defaultRetryIntervalType` | `job.runtimePolicy.retry.intervalType` | 新建 Job 时 | 是 | 保存到 Job 对象 | |
| `defaultRetryBaseIntervalSec` | `job.runtimePolicy.retry.baseIntervalSec` | 新建 Job 时 | 是 | 保存到 Job 对象 | |
| `defaultRetryMaxIntervalSec` | `job.runtimePolicy.retry.maxIntervalSec` | 新建 Job 时 | 是 | 保存到 Job 对象 | 指数退避时使用 |
| `defaultAfterRetryExhaustedAction` | `job.runtimePolicy.failure.afterRetryExhaustedAction` | 新建 Job 时 | 是 | 保存到 Job 对象 | 对 Job 场景可裁剪动作枚举 |
| `defaultAlertOnFailure` | `job.runtimePolicy.failure.alertOnFailure` | 新建 Job 时 | 是 | 保存到 Job 对象 | 仍需 AlertRules 判定是否告警 |
| `defaultOnFailureAction` | `job.runtimePolicy.failure.onFailureAction` | 新建 Job 时 | 是 | 保存到 Job 对象 | Job 可支持 `terminate/retry` 为主 |

说明：

- `defaultJoinPolicy` 不适用于单 Job 对象
- `defaultDryRunVisible / defaultCommentRequired / defaultPriority` 不属于 JobEdit，对应触发入口或弹窗逻辑

#### C. Job 类型差异化约束（建议）

不同 `jobType` 可对对象级执行策略进行裁剪：

1. `sql_agent`
- 可弱化对象级重试（如交由 SQL Agent 内部重试策略管理）

2. `stored_proc`
- 对象级超时、重试较常见，建议完整支持

3. `python`
- 对象级超时、重试、失败告警均建议支持

原型阶段建议先统一展示，再根据类型隐藏少数字段。

#### D. “恢复默认值”语义（JobEdit）

JobEdit 可参考 `11.L` 的节点侧语义，但作用于对象级字段：

- 字段来源标签：`默认 / 已覆盖`
- 点击“恢复默认值”读取当前 `Settings.runtimeDefaults`
- 不回写历史 Run，不影响其他 Job

### 11.P.5 JobDetail 的映射边界（查看页）

#### A. 建议展示内容

1. 对象级运行策略摘要（只读）
- 当前 Job 超时
- 当前 Job 重试策略
- 当前 Job 失败策略

2. 可选显示“平台默认值参考”
- 用于对比当前 Job 是否覆盖了默认值

示例展示形式（原型）：

- `超时：1800s（已覆盖平台默认 1200s）`
- `重试：3 次（沿用平台默认）`

#### B. 与“运行一次”入口的关系

`JobDetail` 的“运行一次”按钮仍通过 `RunTriggerDialog`，因此触发入口默认值沿用 `11.M`，不在 `JobDetail` 重复实现。

#### C. 不建议在 JobDetail 做的事情

- 直接编辑 `Settings.runtimeDefaults`
- 混合编辑对象级运行策略与触发入口测试 UI 策略

说明：

- `JobDetail` 应优先保持“查看 + 运行 + 运行历史 + 引用关系”的清晰职责

### 11.P.6 WorkflowDetail / JobDetail 的“默认值对比”展示建议（增强可读性）

为帮助用户理解“为什么行为不同”，建议在详情页摘要中增加轻量对比提示：

1. `沿用平台默认`
- 当对象级字段未显式覆盖时显示

2. `已覆盖平台默认`
- 当对象级字段存在显式值且与 Settings 不同

3. `不适用`
- 如 `defaultJoinPolicy` 在 JobDetail 中

注意：

- 该提示仅作为展示，不触发自动同步逻辑

### 11.P.7 与 `11.K mock store` 的联动建议

建议在 store/actions 中增加或细化：

1. `openJobEdit(input)`
- 新建时回填 `job.runtimePolicy` 默认值
- 编辑时加载对象值并计算字段来源状态

2. `resetJobRuntimePolicyFieldToDefault(input)`
- 对象级字段恢复默认值

3. `selectJobRuntimePolicyViewModel(jobId)`
- 输出“当前值 + 默认值 + 来源标签”供 `JobDetail / JobEdit` 复用

4. `selectWorkflowDefaultsReferenceViewModel(workflowId)`
- 输出 WorkflowDetail 的“平台默认策略参考”卡片数据

### 11.P.8 测试用例建议（原型逻辑）

建议至少覆盖以下场景：

1. 新建 Job 时对象级运行策略从 Settings 正确回填
2. 编辑已有 Job 时优先显示对象已保存策略，不被 Settings 覆盖
3. JobEdit 点击“恢复默认值”后读取当前 Settings 新值
4. WorkflowDetail 仅展示默认策略参考，不改写节点配置
5. JobDetail “运行一次”弹窗仍遵循 `11.M` 规则，而非 JobEdit 页面策略

### 11.P.9 v3.2 实现优先级（对象页面层）

1. `JobEdit` 对象级运行策略默认值回填 + 恢复默认值
2. `JobDetail` 运行策略摘要 + 平台默认对比提示
3. `WorkflowDetail` 平台默认策略参考卡片（只读）
4. `openJobEdit / selectJobRuntimePolicyViewModel` 等 actions/selectors 落地

## 11.Q MVP 冻结规范（范围 / 澄清项 / 验收标准）（v3.3）

> 本节用于将前文的“建议项、可选项、后续扩展点”收敛为可执行的 MVP 冻结规则。自本节起，若与前文“建议/可选”表述冲突，以本节为准（仅针对 MVP 范围）。

### 11.Q.1 MVP 目标（冻结）

MVP 目标不是“完整调度平台”，而是做出一个可演示、可联动、逻辑闭环完整的前端原型，满足以下能力：

1. 能配置执行对象
- `Connection / Job / Workflow / Schedule / Trigger`

2. 能触发并产生运行结果
- 手动触发、Schedule 模拟触发、Trigger 测试触发
- 生成统一 `Run + RunEvent`

3. 能看到运行过程与结果
- `RunsList / RunDetail`
- 支持 `partial_success`

4. 能形成告警闭环
- 事件进入规则判定
- 命中规则生成/聚合 `Alert`
- 在 `AlertsList` 中处理状态

5. 能展示监控总览
- `Dashboard` 展示 KPI / 趋势 / 热点 / 实时队列（mock 数据实时联动）

### 11.Q.2 MVP 非目标（明确排除）

以下内容明确不纳入当前 MVP 实现：

1. 登录与工作空间流程
- `Login / WorkspaceSelect` 页面暂不接入实际流程
- 当前按单工作空间视角运行

2. 后端 API 与真实执行器
- 不接真实数据库、Agent、Webhook 服务
- 使用 mock store + mock engine 演示

3. 高级规则与高级画布能力
- 不做复杂规则拖拽构造器
- 不做撤销重做、多人协作、复杂对齐算法

4. 全量治理能力
- RBAC、标签规范、命名规范先做骨架或展示，不做完整权限校验引擎

5. 真实日志系统与清理任务
- 日志/保留策略只做配置表达，不执行后台清理

### 11.Q.3 MVP 页面与模块范围（冻结清单）

#### A. 必做页面（必须可联动）

1. `Dashboard`
2. `WorkflowsList`
3. `WorkflowDetail`
4. `WorkflowEditor`
5. `JobsList`
6. `JobDetail`
7. `JobEdit`
8. `SchedulesList`
9. `ScheduleEdit`
10. `TriggersList`
11. `TriggerDetail`（至少 Webhook 测试触发）
12. `RunsList`
13. `RunDetail`
14. `AlertsList`
15. `AlertRules`
16. `ConnectionsList`
17. `ConnectionDetail`
18. `Settings`（至少前三个 Tab）

#### B. 可保留但不纳入主演示链路

- `Login`
- `WorkspaceSelect`

### 11.Q.4 MVP 核心对象最小字段集（冻结）

以下为“实现必须具备”的最小字段集；超出字段可后补但不影响 MVP 成立。

#### A. `Workflow`

- `workflowId`
- `name`
- `enabled`
- `currentPublishedVersionId`
- `draftVersionId`
- `tags`

#### B. `WorkflowVersion`

- `versionId`
- `workflowId`
- `versionNo`
- `versionType`（`draft | published`）
- `graph`（`nodes[]`, `edges[]`）
- `paramsSchema`

#### C. `Job`

- `jobId`
- `name`
- `jobType`
- `connectionId?`
- `enabled`
- `runtimePolicy?`（对象级执行策略）

#### D. `Schedule`

- `scheduleId`
- `targetType`
- `targetId`
- `enabled`
- `scheduleType`
- `scheduleConfig`
- `paramMappingConfig?`
- `triggerOptions?`（至少 `priority`）

#### E. `Trigger`

- `triggerId`
- `triggerType`
- `targetType`
- `targetId`
- `enabled`
- `paramMappingConfig?`
- `securityConfig?`
- `triggerOptions?`（至少 `priority`）

#### F. `Run`

- `runId`
- `objectType`
- `objectId`
- `objectName`
- `triggerType`
- `status`
- `startTime`
- `endTime?`
- `durationMs?`
- `initiator`
- `rootRunId?`
- `parentRunId?`
- `errorCode?`
- `errorSummary?`
- `isDryRun?`
- `finalStatusReason?`

#### G. `RunEvent`

- `eventId`
- `runId`（连接事件允许伪 runId 或可空，MVP 选其一）
- `eventType`
- `stage`
- `severity`
- `time`
- `sequence`
- `message`
- `errorCode?`
- `payload?`

#### H. `Alert`

- `alertId`
- `status`
- `ruleId`
- `runId?`
- `objectType`
- `objectId`
- `objectName`
- `nodeId?`
- `errorCode?`
- `summary`
- `dedupKey`
- `count`
- `firstSeen`
- `lastSeen`

#### I. `AlertRule`

- `ruleId`
- `name`
- `enabled`
- `eventMatchConfig`
- `thresholdConfig`
- `dedupConfig`
- `notificationConfig`

#### J. `Connection`

- `connectionId`
- `connectionType`
- `name`
- `enabled`
- `status`
- `lastCheckAt?`
- `lastErrorCode?`

### 11.Q.5 MVP 工作流编辑器能力边界（冻结）

#### A. 节点类型（MVP 必做）

1. `start`
2. `end`
3. `job`（执行节点，绑定 Job）
4. `condition`（条件分支）
5. `join`（汇聚）

#### B. 节点类型（MVP 延后）

- `delay`
- `notification`
- `subflow`
- 专用 `retry` 节点（使用节点策略即可）

#### C. 画布交互（MVP 必做）

- 节点选择
- 节点拖拽移动
- 连线创建
- 连线删除
- 节点删除
- 缩放与 Fit to Content（至少一种）
- 基础校验反馈（节点/连线错误提示）

#### D. 画布交互（MVP 延后）

- 撤销/重做
- 复杂对齐辅助线
- 框选多选
- 快捷键全套支持

### 11.Q.6 MVP 节点执行策略（冻结）

#### A. 节点失败动作（全部纳入 MVP）

- `terminate`
- `skip`
- `retry`
- `compensate`
- `continue_parallel`

#### B. 汇聚策略（MVP 冻结）

- 仅支持 `all_success`
- UI 可显示为默认值，不提供切换（MVP 阶段）

说明：

- 文档中保留 `all_done / any_success / quorum`，但不在 MVP 实现

#### C. 重试策略（MVP 冻结）

支持字段：

- `enabled`
- `maxAttempts`（不含首次）
- `intervalType`（`fixed | exponential`）
- `baseIntervalSec`
- `maxIntervalSec`（exponential 时）
- `afterRetryExhaustedAction`

不做：

- `jitter`
- 按错误码白名单高级重试（UI 可不暴露）

### 11.Q.7 MVP 触发入口能力边界（冻结）

#### A. 手动触发（RunTriggerDialog）

必须支持：

- 参数输入
- `comment`
- `dryRun`（受 `Settings.defaultDryRunVisible` 控制是否显示）
- `commentRequired`（受 `Settings.defaultCommentRequired` 控制校验）
- 触发后生成 `Run` 并跳转 `RunDetail`

#### B. Schedule

必须支持：

- 绑定 `Workflow / Job`
- 时间策略配置（至少 `cron` + `interval`）
- 参数映射（简化版）
- 高级执行选项中的 `priority`

MVP 可不支持：

- 日历高级规则
- 冲突策略复杂配置

#### C. Trigger（Webhook/Upstream）

必须支持：

- 绑定 `Workflow / Job`
- 参数映射（简化版）
- Webhook 基础安全配置展示（签名/白名单可 mock）
- 测试触发（`validate_only` + `trigger_run`）

### 11.Q.8 MVP 运行与事件模型（冻结）

#### A. `Run` 顶层状态（冻结）

- `pending`
- `queued`
- `running`
- `success`
- `failed`
- `partial_success`
- `cancelled`

#### B. `RunEvent` 最小事件集（MVP 必做）

运行/节点事件：

- `run_created`
- `run_started`
- `run_completed_success`
- `run_completed_failed`
- `run_completed_partial_success`
- `node_started`
- `node_completed_success`
- `node_completed_failed`
- `node_retry_scheduled`
- `node_skipped`
- `node_compensation_success`
- `node_join_evaluated`

触发/调度事件（MVP 轻量）：

- `trigger_received`
- `trigger_rejected`
- `schedule_due`
- `schedule_dispatched`

连接事件（MVP 必做）：

- `connection_check_success`
- `connection_check_failed`
- `connection_offline`
- `connection_recovered`

#### C. `RunEvent` 对连接事件的实现选择（冻结）

MVP 采用：

- 使用伪 `runId`（格式建议：`SYS-CONN-{connectionId}`）

原因：

- 简化 `RunEvent` 类型统一与索引结构
- 避免连接事件单独建第二套事件实体

### 11.Q.9 MVP 告警规则与告警处理（冻结）

#### A. 告警规则能力（MVP）

支持：

- 事件类型匹配
- 对象范围（全部 / 指定对象 / 标签可选简化为全部+指定对象）
- 阈值模式：
  - `single_event`
  - `count_in_window`
- 去重窗口
- 通知渠道（仅配置表达）

不做：

- 复杂嵌套条件
- 升级策略自动升级链路执行

#### B. 告警去重键（冻结）

- `objectId + nodeId + errorCode`
- 缺失值占位：
  - `nodeId = "-"`（如 run/connection 级事件）
  - `errorCode = "UNKNOWN"`

#### C. 告警状态流转（MVP）

支持：

- `open -> acknowledged -> resolved`
- `open -> muted`

可展示但不必实现完整流程：

- `in_progress`

说明：

- `in_progress` 可先作为状态枚举存在，UI 按需展示，动作按钮可不做

### 11.Q.10 MVP Dashboard 指标口径（冻结）

必须实现的 KPI：

1. 今日运行次数
2. 严格成功率（只算 `success`）
3. 部分成功数（`partial_success`）
4. 失败数（`failed`）
5. 平均耗时
6. 当前队列长度（`queued + running`）

可选但建议 mock 展示：

- SLA 违规数（可由 `sla_breached` 事件或 mock 值）

趋势图最低要求：

- `success / partial_success / failed` 三类趋势

### 11.Q.11 MVP Settings 范围（冻结）

#### A. 必做 Tab（可编辑并影响联动）

1. `运行默认策略`
2. `告警默认策略`
3. `日志与保留策略`（配置表达）

#### B. 骨架 Tab（可只做展示）

1. `全局变量`
2. `角色与权限`
3. `标签与命名规范`

#### C. `runtimeDefaults` 字段冻结（MVP）

必须具备：

- `defaultNodeTimeoutSec`
- `defaultRetryEnabled`
- `defaultMaxAttempts`
- `defaultRetryIntervalType`
- `defaultRetryBaseIntervalSec`
- `defaultRetryMaxIntervalSec`
- `defaultAfterRetryExhaustedAction`
- `defaultAlertOnFailure`
- `defaultOnFailureAction`
- `defaultJoinPolicy`（固定 `all_success`，UI 可只读展示）
- `defaultPriority`
- `defaultDryRunVisible`
- `defaultCommentRequired`

暂不启用（可保留字段）：

- `defaultRunTimeoutSec`（保留但不在 MVP 入口大范围使用）

### 11.Q.12 MVP mock store 与动作（冻结最小实现）

#### A. 必做 store 分片

- `entities.runs`
- `entities.runEvents`
- `entities.alerts`
- `entities.alertRules`
- `entities.workflows`
- `entities.workflowVersions`
- `entities.jobs`
- `entities.schedules`
- `entities.triggers`
- `entities.connections`
- `indexes.eventIdsByRunId`
- `indexes.alertIdsByRunId`
- `ui.workflowEditor`
- `ui.runTriggerDialog`
- `ui.alerts`
- `ui.dashboard`
- `settings.runtimeDefaults`（可放 `entities/settings` 或独立分片，MVP 冻结为独立分片即可）

#### B. 必做 actions（最小闭环）

1. `createWorkflowNode`
2. `updateNodeConfig`
3. `saveWorkflowDraft`
4. `publishWorkflow`
5. `openRunTriggerDialog`
6. `validateRunTriggerDialog`
7. `triggerRunManual`
8. `appendRunEvent`
9. `completeRun`
10. `evaluateAlertRulesForEvent`
11. `upsertAlertByDedupKey`
12. `acknowledgeAlert`
13. `resolveAlert`
14. `runConnectionHealthCheck`
15. `openTriggerDetailTestDialog`
16. `submitTriggerTest`
17. `resolveTriggerExecutionOptions`

#### C. 必做 selectors（页面联动最小集）

1. `selectRunById`
2. `selectRunEvents`
3. `selectRunAlerts`
4. `selectDashboardKpis`
5. `selectRunTrendSeries`
6. `selectFailureHotspots`
7. `selectAlertDrawerViewModel`
8. `selectWorkflowDetailHeaderViewModel`
9. `selectJobRuntimePolicyViewModel`
10. `selectRuntimeDefaults`

### 11.Q.13 MVP 演示数据场景（冻结）

MVP 至少内置以下 4 个场景（mock seed）：

1. `success_workflow_run`
- 工作流执行成功，无告警

2. `partial_success_with_compensation`
- 节点失败 -> 补偿成功 -> `partial_success`
- 生成可解释时间线

3. `repeated_failure_alert_dedup`
- 同对象/节点/错误码连续失败
- 告警聚合计数增长

4. `connection_offline_alert`
- 连接探活失败 -> `connection_offline`
- 生成连接类告警

### 11.Q.14 MVP 页面验收标准（可直接用于自测）

#### A. 工作流编辑器

- 新建 `job` 节点时自动回填运行默认策略
- NodeInspector 能修改失败动作/重试并保存
- 发布后 `WorkflowsList / WorkflowDetail` 可见版本变化

#### B. 手动触发与运行中心

- 从 `WorkflowDetail` 或 `JobDetail` 打开手动触发弹窗
- 弹窗 `dryRun/comment` 行为遵循 Settings 默认策略
- 提交后生成 `Run` 并跳转 `RunDetail`
- `RunDetail` 时间线可看到节点失败/重试/补偿/部分成功（至少其一链路）

#### C. 告警中心

- 失败事件命中规则生成告警
- 相同 dedupKey 连续失败时告警 `count` 增长而不是重复开新告警
- `acknowledged`、`resolved` 操作能在列表和详情抽屉中联动更新

#### D. 触发入口

- `ScheduleEdit` 可配置目标对象与 `priority`
- `TriggerDetail` 可测试触发（`validate_only` / `trigger_run`）
- `trigger_run` 能生成 `Run + RunEvent`

#### E. 连接与仪表盘

- `ConnectionDetail` 测试探活能更新状态并产生连接事件
- 连接离线能命中规则生成告警
- Dashboard KPI 与趋势能反映新增运行和告警变化

### 11.Q.15 MVP 延后清单（冻结，不在本轮实现）

以下内容保留文档设计，但从当前开发任务中移除：

1. 登录/工作空间接入
2. 多环境（已取消）
3. 子流程（`subflow`）节点
4. 高级汇聚策略（`all_done / any_success / quorum`）
5. 告警规则复杂条件构造器（拖拽/嵌套表达式）
6. 规则测试的复杂历史事件回放
7. Dashboard 全量 SLA 真实计算
8. 真实 webhook 服务接入
9. 真实连接探活与真实数据库执行
10. 审计日志完整链路与导出

### 11.Q.16 MVP 实施顺序（建议直接执行）

#### Phase 1：数据层与默认值体系

1. 落地 `settings.runtimeDefaults`
2. 落地 `runs/runEvents/alerts/alertRules` 分片 + 基础 selectors
3. 落地默认值回填链路：
- `createWorkflowNode`
- `openRunTriggerDialog`
- `openTriggerDetailTestDialog`
- `resolveTriggerExecutionOptions`

#### Phase 2：工作流与运行闭环

1. `WorkflowEditor + NodeInspector`（失败策略/重试/补偿）
2. `RunTriggerDialog`
3. `RunsList / RunDetail`
4. `triggerRunManual` + mock event engine

#### Phase 3：告警与连接闭环

1. `AlertRules`（模板+表单）
2. `AlertsList`（列表+抽屉+状态动作）
3. `ConnectionsList / ConnectionDetail`
4. `runConnectionHealthCheck` -> 连接事件 -> 告警

#### Phase 4：触发入口与总览

1. `SchedulesList / ScheduleEdit`
2. `TriggersList / TriggerDetail（测试触发）`
3. `Dashboard`（KPI/趋势/热点/队列）

### 11.Q.17 文档使用规则（MVP 开发期间）

为避免继续发散，MVP 开发期间建议按以下规则执行：

1. 遇到“文档中有可选方案但未冻结”的项
- 优先以 `11.Q` 为准
- 若 `11.Q` 未覆盖，再补充到对应章节并追加版本记录

2. 遇到“实现复杂度超出当前阶段”的项
- 先放入 `11.Q.15 MVP 延后清单`
- 不在实现中临时扩 scope

3. 新增默认值继承相关规则
- 必须同步更新 `11.O`（总览）以及对应映射章节（`11.L/M/N/P`）

## 12. 原型代码与信息架构观察（基于现有仓库）

### 12.1 已覆盖的页面模块（源码）

- 仪表盘：`src/app/pages/Dashboard.tsx`
- 作业：`src/app/pages/JobsList.tsx` / `src/app/pages/JobDetail.tsx` / `src/app/pages/JobEdit.tsx`
- 工作流：`src/app/pages/WorkflowsList.tsx` / `src/app/pages/WorkflowDetail.tsx` / `src/app/pages/WorkflowEditor.tsx`
- 调度计划：`src/app/pages/SchedulesList.tsx` / `src/app/pages/ScheduleEdit.tsx`
- 触发器：`src/app/pages/TriggersList.tsx` / `src/app/pages/TriggerDetail.tsx`
- 运行中心：`src/app/pages/RunsList.tsx` / `src/app/pages/RunDetail.tsx`
- 告警：`src/app/pages/AlertsList.tsx` / `src/app/pages/AlertRules.tsx`
- 资源连接：`src/app/pages/ConnectionsList.tsx` / `src/app/pages/ConnectionDetail.tsx`
- 设置：`src/app/pages/Settings.tsx`

### 12.2 编排器组件（源码）

- `src/app/components/NodePalette.tsx`
- `src/app/components/WorkflowCanvas.tsx`
- `src/app/components/NodeInspector.tsx`

### 12.3 入口与路由观察

- 路由文件：`src/app/routes.tsx`
- 根布局：`src/app/components/RootLayout.tsx`
- `Login` 与 `WorkspaceSelect` 页面已存在，但尚未接入当前路由（后续实现时处理）

### 12.4 当前原型明显缺口（待后续实现）

- 中文文案存在编码乱码（需统一 UTF-8）
- 多数交互为静态 mock，缺少跨页面状态联动
- 工作流画布缺少连线创建/删除、节点删除、结构化校验结果展示
- 运行/告警尚未由统一事件模型驱动

## 13. 后续讨论的更新约定（重要）

为保持文档可持续迭代，后续讨论建议按以下方式更新本文件：

- 新确认的产品规则：追加到 `3. 已确认核心决策`
- 新状态/字段/枚举：更新对应章节（`4/7/8/9/10`）
- 页面落地方案：更新 `11. 原型页面级改造清单`
- 若规则发生变化：在原条目后标注 `v1.x 修订`

## 14. 版本记录

### v1.0（当前）

已纳入：

- 平台主逻辑闭环
- 调度对象边界（Job/Workflow 双绑定，主推 Workflow）
- 统一 Run 模型与顶层状态（含 `partial_success`）
- 节点失败处理语义（终止/跳过/重试/补偿/继续并行）
- 并行汇聚默认策略 `all_success`
- 告警双层模型（事件采集 + 规则判定）
- 告警去重键（对象+节点+错误码）
- RunEvent 字典与字段规范（v1）
- retry / compensate / manual trigger / partial_success 展示规则（v1.1）
- WorkflowNodeConfig 节点配置 Schema（v1.2）
- Python 脚本作为“子工作流”时的状态传递方案（黑盒/半托管/托管）
- SQL / 存储过程执行的状态传递方案（黑盒/结构化结果）
- 页面级改造清单（讨论版）


### v1.3（增量）

已纳入：

- ErrorCode 错误码规范（命名规则、分层字典、重试建议、告警去重关系、原型最小集）

### v1.4（增量）

已纳入：

- `Run -> RunEvent -> Alert` 三类示例数据流（success / partial_success / 告警聚合）

### v1.5（增量）

已纳入：

- AlertRule 条件构造器（v1 简化版）：规则模型、阈值模式、去重聚合、页面交互与示例规则

### v1.6（增量）

已纳入：

- NodeInspector 表单布局与交互细化（分组结构、类型显示矩阵、字段布局、状态管理、校验与画布联动）

### v1.7（增量）

已纳入：

- RunTriggerDialog 表单布局与交互状态机细化（字段渲染、状态流转、校验、提交行为与页面联动）

### v1.8（增量）

已纳入：

- RunDetail 页面设计细化（时间线/流程回放/日志视图、事件映射、partial_success 展示与告警联动）

### v1.9（增量）

已纳入：

- AlertsList 与告警详情抽屉设计细化（列表列、详情抽屉、操作流、状态机与页面联动）

### v2.0（增量）

已纳入：

- WorkflowCanvas 画布交互细化（连线创建/删除、吸附对齐、校验反馈、视图控制与组件职责）

### v2.1（增量）

已纳入：

- Dashboard 指标口径与模块联动细化（KPI、趋势、失败热点、实时队列、告警摘要与刷新策略）

### v2.2（增量）

已纳入：

- AlertRules 页面表单布局与规则模板交互细化（模板创建、分组表单、校验、规则测试与模块联动）

### v2.3（增量）

已纳入：

- WorkflowsList / WorkflowDetail / WorkflowEditor 三页联动流程细化（版本、发布、试运行、回滚与刷新策略）

### v2.4（增量）

已纳入：

- Schedules / Triggers 统一触发入口与参数映射交互细化（绑定对象、映射、校验、预览、测试触发与事件链）

### v2.5（增量）

已纳入：

- Connections 模块与健康检查/事件上报/告警联动细化（列表/详情、健康检查结果标准化、连接事件与告警模板联动）

### v2.6（增量）

已纳入：

- 前端 mock store 数据结构总纲（实体分片、UI 分片、selectors、actions、联动流程与实现优先级）

### v2.7（增量）

已纳入：

- Settings 模块重构（移除环境后）：运行默认策略、日志与保留策略、告警默认策略及治理类 Tab 设计

### v2.8（增量）

已纳入：

- 前端 mock store 实现级规格（分片字段清单、索引约定、Selector 命名规范、Action 输入输出与校验约定）

### v2.9（增量）

已纳入：

- NodeInspector 与 Settings「运行默认策略」字段映射表（回填、覆盖、恢复默认值与保存语义）

### v3.0（增量）

已纳入：

- RunTriggerDialog 与 Settings「运行默认策略」字段映射表（显示策略、默认值回填、校验规则与入口上下文覆盖）

### v3.1（增量）

已纳入：

- Settings.runtimeDefaults 在 ScheduleEdit / TriggerDetail 的字段映射表（触发入口侧默认值、测试触发 UI 策略与执行选项合成规则）

### v3.2（增量）

已纳入：

- Settings.runtimeDefaults 默认值继承与覆盖总览（文字版，串联 NodeInspector / RunTriggerDialog / ScheduleEdit / TriggerDetail）
- Settings.runtimeDefaults 在 WorkflowDetail / JobEdit / JobDetail 的映射边界与交互细化（对象页面层）

### v3.3（增量）

已纳入：

- MVP 冻结规范（范围、非目标、最小字段集、编辑器/触发/运行/告警/Settings 边界、必做 actions/selectors、演示场景、验收标准、实施顺序）
