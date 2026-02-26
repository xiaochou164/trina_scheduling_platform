import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), 'backend', 'data');
const dataFile = path.join(dataDir, 'store.json');

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(
      dataFile,
      JSON.stringify(
        {
          users: {
            admin: {
              userId: 'U-1',
              username: 'admin',
              password: 'admin123',
              displayName: '管理员',
              workspaceIds: ['WS-1', 'WS-2'],
            },
          },
          workspaces: {
            'WS-1': { workspaceId: 'WS-1', name: '生产调度中心' },
            'WS-2': { workspaceId: 'WS-2', name: '测试调度中心' },
          },
          sessions: {},
          jobs: {
            'JOB-1001': { jobId: 'JOB-1001', name: '财务日报生成', jobType: 'sql_agent', status: 'enabled', updatedAt: new Date().toISOString() },
            'JOB-1002': { jobId: 'JOB-1002', name: '库存盘点', jobType: 'stored_proc', status: 'enabled', updatedAt: new Date().toISOString() },
          },
          workflows: {},
          runs: {},
          alerts: {},
          meta: { createdAt: new Date().toISOString() },
        },
        null,
        2,
      ),
    );
  }
}

export function createSession({ userId, workspaceId }) {
  const store = readStore();
  const token = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  store.sessions[token] = { token, userId, workspaceId, createdAt: new Date().toISOString() };
  writeStore(store);
  return store.sessions[token];
}

export function getSession(token) {
  const store = readStore();
  return store.sessions[token] ?? null;
}

export function removeSession(token) {
  const store = readStore();
  delete store.sessions[token];
  writeStore(store);
}

export function listWorkspacesForUser(username) {
  const store = readStore();
  const user = store.users[username];
  if (!user) return [];
  return user.workspaceIds.map((id) => store.workspaces[id]).filter(Boolean);
}

export function findUserByCredentials(username, password) {
  const store = readStore();
  const user = store.users[username];
  if (!user || user.password !== password) return null;
  return user;
}

export function switchSessionWorkspace(token, workspaceId) {
  const store = readStore();
  const session = store.sessions[token];
  if (!session) return null;
  session.workspaceId = workspaceId;
  session.updatedAt = new Date().toISOString();
  writeStore(store);
  return session;
}

export function upsertWorkflowMeta({ workflowId, workflowName }) {
  const store = readStore();
  store.workflows[workflowId] ??= { drafts: [], publishedVersions: [] };
  store.workflows[workflowId].workflowId = workflowId;
  store.workflows[workflowId].name = workflowName;
  store.workflows[workflowId].updatedAt = new Date().toISOString();
  writeStore(store);
}

function applyListQuery(items, query) {
  const keyword = (query.search ?? '').toLowerCase();
  const status = query.status;
  const sortBy = query.sortBy ?? 'updatedAt';
  const order = query.order === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(query.page ?? 1));
  const pageSize = Math.max(1, Math.min(100, Number(query.pageSize ?? 20)));

  let rows = items;
  if (keyword) {
    rows = rows.filter((item) => JSON.stringify(item).toLowerCase().includes(keyword));
  }
  if (status) {
    rows = rows.filter((item) => String(item.status ?? '') === status);
  }

  rows = rows.sort((a, b) => {
    const av = a[sortBy] ?? '';
    const bv = b[sortBy] ?? '';
    if (av === bv) return 0;
    if (order === 'asc') return av > bv ? 1 : -1;
    return av < bv ? 1 : -1;
  });

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const data = rows.slice(start, start + pageSize);
  return { data, page, pageSize, total, sortBy, order, filters: { search: query.search ?? '', status: status ?? '' } };
}

export function listWorkflows(query = {}) {
  const store = readStore();
  const items = Object.values(store.workflows).map((wf) => ({
    workflowId: wf.workflowId,
    name: wf.name ?? wf.workflowId,
    status: wf.latestPublished ? 'published' : 'draft',
    updatedAt: wf.updatedAt ?? wf.latestDraft?.savedAt ?? store.meta.createdAt,
  }));
  return applyListQuery(items, query);
}

export function listJobs(query = {}) {
  const store = readStore();
  return applyListQuery(Object.values(store.jobs), query);
}

export function getWorkflowById(workflowId) {
  const store = readStore();
  return store.workflows[workflowId] ?? null;
}

export function getJobById(jobId) {
  const store = readStore();
  return store.jobs[jobId] ?? null;
}

export function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
}

export function writeStore(nextStore) {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify(nextStore, null, 2));
}

export function upsertWorkflowDraft({ workflowId, workflowName, nodes, edges }) {
  const store = readStore();
  store.workflows[workflowId] ??= { drafts: [], publishedVersions: [] };
  const draft = {
    workflowId,
    workflowName,
    nodes,
    edges,
    savedAt: new Date().toISOString(),
  };
  store.workflows[workflowId].latestDraft = draft;
  store.workflows[workflowId].workflowId = workflowId;
  store.workflows[workflowId].name = workflowName;
  store.workflows[workflowId].updatedAt = draft.savedAt;
  store.workflows[workflowId].drafts.push(draft);
  writeStore(store);
  return draft;
}

export function publishWorkflowVersion({ workflowId, workflowName, nodes, edges }) {
  const store = readStore();
  store.workflows[workflowId] ??= { drafts: [], publishedVersions: [] };
  const versionNo = `v${store.workflows[workflowId].publishedVersions.length + 1}`;
  const published = {
    workflowId,
    workflowName,
    versionNo,
    nodes,
    edges,
    publishedAt: new Date().toISOString(),
  };
  store.workflows[workflowId].publishedVersions.push(published);
  store.workflows[workflowId].latestPublished = published;
  store.workflows[workflowId].workflowId = workflowId;
  store.workflows[workflowId].name = workflowName;
  store.workflows[workflowId].updatedAt = published.publishedAt;
  writeStore(store);
  return published;
}

export function createRun({ workflowId, workflowName, status, issues = [] }) {
  const store = readStore();
  const runId = `RUN-${Date.now()}`;
  const run = {
    runId,
    workflowId,
    workflowName,
    status,
    issues,
    startedAt: new Date().toISOString(),
  };
  store.runs[runId] = run;
  if (status === 'failed') {
    const alertId = `ALERT-${Date.now()}`;
    store.alerts[alertId] = {
      alertId,
      workflowId,
      workflowName,
      status: 'open',
      summary: issues[0]?.message ?? 'workflow run failed',
      createdAt: new Date().toISOString(),
      issues,
    };
  }
  writeStore(store);
  return run;
}

export function listRunsByWorkflow(workflowId) {
  const store = readStore();
  return Object.values(store.runs)
    .filter((run) => run.workflowId === workflowId)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

export function listAlertsByWorkflow(workflowId) {
  const store = readStore();
  return Object.values(store.alerts)
    .filter((alert) => alert.workflowId === workflowId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function cloneWorkflow(workflowId) {
  const store = readStore();
  const source = store.workflows[workflowId];
  if (!source) return null;
  const clonedId = `WF-${Date.now()}`;
  const now = new Date().toISOString();
  store.workflows[clonedId] = {
    ...JSON.parse(JSON.stringify(source)),
    workflowId: clonedId,
    name: `${source.name ?? workflowId}-副本`,
    updatedAt: now,
  };
  writeStore(store);
  return store.workflows[clonedId];
}

export function cloneJob(jobId) {
  const store = readStore();
  const source = store.jobs[jobId];
  if (!source) return null;
  const clonedId = `JOB-${Date.now()}`;
  const now = new Date().toISOString();
  store.jobs[clonedId] = {
    ...JSON.parse(JSON.stringify(source)),
    jobId: clonedId,
    name: `${source.name}-副本`,
    updatedAt: now,
  };
  writeStore(store);
  return store.jobs[clonedId];
}

export function setJobStatus(jobId, status) {
  const store = readStore();
  const job = store.jobs[jobId];
  if (!job) return null;
  job.status = status;
  job.updatedAt = new Date().toISOString();
  writeStore(store);
  return job;
}
