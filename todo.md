# 真实后端实施待办清单（以“实现全部真实后端功能与接口”为目标）

> 基于 `Prototype-Design-Doc.md` 的 v1~v3.3 范围整理，按“先可用闭环、再可运营、最后可扩展”的顺序推进。

## P0：后端基础设施与工程骨架

- [ ] 选型并初始化后端工程（建议：Node.js + TypeScript + Fastify/NestJS）
- [ ] 建立分层结构：`api / application / domain / infra / scheduler / worker`
- [ ] 接入配置中心（多环境配置、密钥管理、运行参数）
- [ ] 建立数据库与迁移体系（Prisma/TypeORM + migration）
- [ ] 建立统一错误码与异常中间件（与文档 ErrorCode 规范对齐）
- [ ] 建立统一审计日志、请求日志、链路追踪（traceId）
- [ ] 建立 OpenAPI/Swagger 文档自动生成
- [ ] 建立鉴权基础（JWT/OIDC）与 RBAC 骨架

## P0：核心数据模型（数据库）

- [ ] 建表：`connections`
- [ ] 建表：`jobs`
- [ ] 建表：`workflows`
- [ ] 建表：`workflow_versions`（draft/published）
- [ ] 建表：`workflow_nodes`
- [ ] 建表：`workflow_edges`
- [ ] 建表：`schedules`
- [ ] 建表：`triggers`
- [ ] 建表：`runs`
- [ ] 建表：`node_runs`
- [ ] 建表：`run_events`
- [ ] 建表：`alert_rules`
- [ ] 建表：`alerts`
- [ ] 建表：`settings_runtime_defaults`
- [ ] 建立必要索引（按 objectId、runId、eventType、status、time）
- [ ] 建立唯一约束（例如 workflow + versionNo）

## P0：Workflow/Job 配置接口（真实 API）

- [ ] `POST /api/workflows` 创建工作流
- [x] `GET /api/workflows` 列表查询（分页/过滤）
- [x] `GET /api/workflows/:id` 详情
- [ ] `PUT /api/workflows/:id` 更新基础信息
- [ ] `POST /api/workflows/:id/draft` 保存草稿（图结构+配置）
- [ ] `POST /api/workflows/:id/validate` 结构化校验（开始/结束/连线/节点配置）
- [ ] `POST /api/workflows/:id/publish` 发布（生成新版本）
- [ ] `POST /api/workflows/:id/rollback` 回滚到指定发布版本
- [ ] `GET /api/workflows/:id/versions` 版本列表
- [ ] `GET /api/workflows/:id/versions/:versionId` 版本详情
- [ ] `POST /api/jobs` / [x] `GET /api/jobs` / [x] `GET /api/jobs/:id` / `PUT /api/jobs/:id`

## P0：触发与调度接口（真实 API）

- [ ] `POST /api/schedules` 创建计划
- [ ] `PUT /api/schedules/:id` 更新计划
- [ ] `POST /api/schedules/:id/enable`、`/disable`
- [ ] `POST /api/triggers` 创建触发器（webhook/upstream/manual）
- [ ] `PUT /api/triggers/:id` 更新触发器
- [ ] `POST /api/triggers/:id/test` 测试触发（validate_only / trigger_run）
- [ ] 实现参数映射引擎（Schedule/Trigger -> Run params）
- [ ] 实现 cron/interval 调度器（含 nextFireTime 计算）

## P0：运行引擎与运行中心接口

- [ ] `POST /api/runs/manual` 手工触发（workflow/job）
- [ ] `POST /api/runs/:id/rerun` 重跑（parentRunId/rootRunId）
- [ ] `GET /api/runs` 运行列表（状态/对象/时间过滤）
- [ ] `GET /api/runs/:id` 运行详情
- [ ] `GET /api/runs/:id/events` 时间线事件
- [ ] 实现统一 Run 状态流转：`pending/queued/running/success/failed/partial_success/cancelled`
- [ ] 实现节点失败策略：`terminate/skip/retry/compensate/continue_parallel`
- [ ] 实现并行汇聚默认策略：`all_success`
- [ ] 实现 `partial_success` 判定规则
- [ ] 运行日志引用 `logRef` 与摘要 `timelineSummary`

## P0：事件模型与告警闭环

- [ ] 后端统一产出 `RunEvent` 事件字典（run/node/trigger/scheduler/connection）
- [ ] `POST /api/alert-rules` / `PUT /api/alert-rules/:id` / `GET /api/alert-rules`
- [ ] 实现规则引擎（事件匹配、阈值、窗口、启停）
- [ ] 实现 dedupKey：`objectId|nodeId|errorCode`
- [ ] `GET /api/alerts` 告警列表
- [ ] `GET /api/alerts/:id` 告警详情
- [ ] `POST /api/alerts/:id/ack` / `POST /api/alerts/:id/resolve` / `POST /api/alerts/:id/mute`
- [ ] 告警状态机：`open/acknowledged/in_progress/resolved/muted`

## P1：连接管理与健康检查

- [ ] `POST /api/connections` / `GET /api/connections` / `GET /api/connections/:id` / `PUT /api/connections/:id`
- [ ] `POST /api/connections/:id/health-check` 手工健康检查
- [ ] 周期健康检查任务（scheduled check）
- [ ] 连接事件上报：`connection_check_success/failed/offline/recovered`
- [ ] 与告警规则联动（连接离线自动告警）

## P1：Settings 与默认策略后端化

- [ ] `GET /api/settings/runtime-defaults`
- [ ] `PUT /api/settings/runtime-defaults`
- [ ] 实现 NodeInspector / RunTriggerDialog / Schedule / Trigger 默认值继承与覆盖逻辑（后端统一）
- [ ] 提供字段来源追踪（settings_default / override）

## P1：Dashboard 聚合接口

- [ ] `GET /api/dashboard/kpi`（成功率、失败率、平均时长等）
- [ ] `GET /api/dashboard/trends`
- [ ] `GET /api/dashboard/hotspots`
- [ ] `GET /api/dashboard/realtime-queue`
- [ ] `GET /api/dashboard/alerts-summary`

## P1：执行器适配层（真实）

- [ ] SQL Agent 执行适配
- [ ] 存储过程执行适配
- [ ] Python 执行适配（黑盒/半托管/托管路径明确）
- [ ] Windows Task 执行适配
- [ ] 执行超时、重试、补偿、取消的统一控制

## P2：可靠性与治理

- [ ] 幂等机制（触发请求幂等键）
- [ ] 分布式锁（避免重复调度）
- [ ] 消息队列化（Run/Event/Alert 异步化）
- [ ] 死信队列与失败补偿任务
- [ ] 数据归档与清理（RunEvent/日志保留策略）
- [ ] 限流、防重放、Webhook 签名校验与白名单

## P2：测试与交付标准

- [ ] 单元测试（domain/service）覆盖核心状态机
- [ ] 集成测试（API + DB + queue）
- [ ] 合约测试（前后端接口 schema）
- [ ] E2E 测试（配置 -> 触发 -> 运行 -> 事件 -> 告警闭环）
- [ ] 性能压测（大批量 RunEvent/Alert 聚合）
- [ ] 灰度发布与回滚方案

## MVP 验收清单（真实后端版本）

- [ ] 能保存/发布 Workflow 版本并可回读
- [ ] 能按 Schedule/Trigger 触发真实 Run
- [ ] 能输出 RunEvent 并在 RunDetail 展示完整时间线
- [ ] 能按规则生成/聚合 Alert 并可处理状态
- [ ] 能看到 Dashboard 基础指标并与运行数据一致
- [ ] 能完成至少 4 个演示场景（success/failed/partial_success/告警聚合）

## 补充（上一版容易遗漏，但真实落地必须覆盖）

### A. 接口契约与兼容性治理

- [ ] 输出并冻结 OpenAPI v1（前后端统一字段名、枚举、错误码）
- [ ] 建立接口版本策略（`/api/v1` + 向后兼容约束）
- [ ] 建立接口变更评审清单（breaking change gate）
- [ ] 建立前后端契约测试（Consumer Driven Contract）

### B. 多租户与权限边界

- [ ] 所有核心表增加 `tenantId/workspaceId` 边界字段
- [ ] 所有查询默认按租户隔离（防越权）
- [ ] 细粒度权限矩阵：查看/编辑/发布/运行/告警处理
- [ ] 敏感操作审计（发布、回滚、手工触发、告警关闭）

### C. 调度器高可用与一致性

- [ ] 调度扫描器 HA（主从选举或分布式锁）
- [ ] schedule 触发去重（同一时间窗幂等）
- [ ] 触发投递至少一次 + 运行去重保证“逻辑上恰好一次”
- [ ] 调度漂移监控（系统时钟偏差、延迟分布）

### D. 运行执行细节（工作流引擎必须项）

- [ ] DAG 合法性校验（环检测）
- [ ] 节点依赖拓扑排序与并行批次执行
- [ ] 节点级重试退避策略（fixed/exponential + jitter）
- [ ] 超时中断与子任务清理（含补偿触发）
- [ ] 人工取消传播策略（run -> node_runs）

### E. 告警通知通道真实化

- [ ] 邮件通道适配（模板、重试、失败队列）
- [ ] 企业微信/钉钉/Webhook 通道适配
- [ ] 通知抑制窗口与静默策略（mute until）
- [ ] 通知发送审计与回执跟踪

### F. 数据生命周期与合规

- [ ] 运行明细冷/热分层存储策略
- [ ] PII/敏感字段脱敏与加密（静态+传输）
- [ ] 合规保留期与自动清理任务
- [ ] 数据备份、恢复演练与 RPO/RTO 目标

### G. 可观测性 SLO

- [ ] 核心 SLI/SLO：触发成功率、调度延迟、运行成功率、告警误报率
- [ ] Prometheus 指标 + Grafana 看板
- [ ] 错误预算与告警分级（P1/P2/P3）
- [ ] 关键链路 tracing（trigger -> run -> event -> alert）

### H. 前后端联调交付清单

- [ ] WorkflowEditor 全链路联调（validate/save/publish/run）
- [ ] RunsList/RunDetail 联调真实事件流
- [ ] AlertsList/AlertRules 联调真实规则引擎
- [ ] Connections 模块联调真实健康检查
- [ ] Dashboard 指标改为真实聚合 API

### I. 发布与运维

- [ ] CI/CD：lint + test + migration check + image scan
- [ ] 蓝绿/金丝雀发布策略
- [ ] 生产配置基线（连接池、超时、重试、熔断）
- [ ] 应急预案（调度雪崩、队列积压、通知风暴）

## 再补充：按“现有前端页面样例”反推仍缺的后端待办

### J. 认证与工作空间（对应 Login / WorkspaceSelect）

- [x] `POST /api/auth/login`（账号密码登录）
- [x] `POST /api/auth/logout`
- [x] `GET /api/auth/me`（当前用户与权限）
- [x] `GET /api/workspaces`（工作空间列表）
- [x] `POST /api/workspaces/switch`（切换工作空间）

### K. 列表页通用能力（对应 Workflows/Jobs/Schedules/Triggers/Runs/Alerts/Connections 列表）

- [x] 统一分页协议：`page/pageSize/total`
- [x] 统一排序协议：`sortBy/order`
- [x] 统一过滤协议：状态、标签、时间区间、关键字（已支持 status/search，时间区间待补）
- [ ] 列表批量操作接口（批量启停/删除/确认）
- [ ] 导出接口（CSV/JSON，异步导出任务）

### L. WorkflowDetail / JobDetail 细化接口

- [x] `GET /api/workflows/:id/runs`（对象维度最近运行）
- [x] `GET /api/workflows/:id/alerts`（对象维度告警）
- [x] `POST /api/workflows/:id/clone`（复制工作流）
- [x] `POST /api/jobs/:id/clone`
- [x] `POST /api/jobs/:id/enable`、`/disable`

### M. ScheduleEdit / TriggerDetail 缺口接口

- [ ] `GET /api/schedules/:id/preview-next-fire-times`（预览未来触发时间）
- [ ] `POST /api/schedules/:id/test-fire`（测试触发）
- [ ] `GET /api/triggers/:id/delivery-history`（触发投递历史）
- [ ] `POST /api/triggers/:id/replay`（重放触发）
- [ ] Webhook 入站端点（签名校验 + 幂等）

### N. RunDetail 缺口接口（时间线/日志/回放）

- [ ] `GET /api/runs/:id/node-runs`（节点明细）
- [ ] `GET /api/runs/:id/logs`（分页日志）
- [ ] `GET /api/runs/:id/logs/stream`（SSE/WebSocket 实时日志）
- [ ] `POST /api/runs/:id/cancel`（取消运行）
- [ ] `GET /api/runs/:id/replay`（流程回放数据）

### O. Alerts 页面能力缺口

- [ ] `POST /api/alerts/:id/assign`（指派处理人）
- [ ] `POST /api/alerts/:id/comment`（处理备注）
- [ ] `GET /api/alerts/:id/timeline`（状态流转历史）
- [ ] `POST /api/alerts/rules/:id/test`（规则测试命中）
- [ ] 告警压缩聚合策略配置接口（按对象/节点/错误码维度）

### P. Connections 详情页缺口

- [ ] `GET /api/connections/:id/events`（连接事件时间线）
- [ ] `GET /api/connections/:id/health-checks`（最近检查记录）
- [ ] `POST /api/connections/:id/rotate-credential`（轮换凭据）
- [ ] `POST /api/connections/:id/validate-config`（配置校验）

### Q. Settings 页面治理类能力

- [ ] `GET /api/settings/log-retention`
- [ ] `PUT /api/settings/log-retention`
- [ ] `GET /api/settings/alert-defaults`
- [ ] `PUT /api/settings/alert-defaults`
- [ ] `GET /api/settings/governance-policies`（命名规范/标签规范/RBAC 模板）

### R. 前端联动所需的“变更通知”能力

- [ ] WebSocket/SSE 推送：Run 状态变化、Alert 新增、Connection 离线
- [ ] 订阅鉴权与租户隔离
- [ ] 前端断线重连与增量补偿游标（lastEventId）
