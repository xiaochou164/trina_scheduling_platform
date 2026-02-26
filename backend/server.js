import http from 'node:http';
import { URL } from 'node:url';
import { validateWorkflowGraph } from './validation.js';
import {
  createRun,
  createSession,
  findUserByCredentials,
  getJobById,
  getSession,
  getWorkflowById,
  listAlertsByWorkflow,
  listJobs,
  listRunsByWorkflow,
  listWorkflows,
  listWorkspacesForUser,
  publishWorkflowVersion,
  removeSession,
  cloneWorkflow,
  cloneJob,
  setJobStatus,
  switchSessionWorkspace,
  upsertWorkflowDraft,
} from './store.js';

const port = Number(process.env.API_PORT ?? 8787);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function workflowIdFromPath(pathname, suffix) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 4) return null;
  if (parts[0] !== 'api' || parts[1] !== 'workflows' || parts[3] !== suffix) return null;
  return parts[2];
}

function readBearerToken(req) {
  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'workflow-api', time: new Date().toISOString() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    try {
      const body = await parseBody(req);
      const user = findUserByCredentials(body.username, body.password);
      if (!user) {
        sendJson(res, 401, { ok: false, message: '用户名或密码错误' });
        return;
      }
      const workspaceId = user.workspaceIds[0];
      const session = createSession({ userId: user.userId, workspaceId });
      sendJson(res, 200, {
        ok: true,
        token: session.token,
        user: { userId: user.userId, username: user.username, displayName: user.displayName },
        workspaceId,
      });
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
    const token = readBearerToken(req);
    if (token) removeSession(token);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/auth/me') {
    const token = readBearerToken(req);
    if (!token) {
      sendJson(res, 401, { ok: false, message: '未登录' });
      return;
    }
    const session = getSession(token);
    if (!session) {
      sendJson(res, 401, { ok: false, message: '会话已失效' });
      return;
    }
    sendJson(res, 200, { ok: true, session });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/workspaces') {
    const username = url.searchParams.get('username') ?? 'admin';
    const items = listWorkspacesForUser(username);
    sendJson(res, 200, { ok: true, data: items });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/workspaces/switch') {
    try {
      const token = readBearerToken(req);
      if (!token) {
        sendJson(res, 401, { ok: false, message: '未登录' });
        return;
      }
      const body = await parseBody(req);
      const session = switchSessionWorkspace(token, body.workspaceId);
      if (!session) {
        sendJson(res, 404, { ok: false, message: '会话不存在' });
        return;
      }
      sendJson(res, 200, { ok: true, session });
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/workflows') {
    const result = listWorkflows(Object.fromEntries(url.searchParams.entries()));
    sendJson(res, 200, { ok: true, ...result });
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/workflows/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    const workflowId = parts[2];
    if (parts.length === 4 && parts[3] === 'runs') {
      const runs = listRunsByWorkflow(workflowId);
      sendJson(res, 200, { ok: true, data: runs });
      return;
    }
    if (parts.length === 4 && parts[3] === 'alerts') {
      const alerts = listAlertsByWorkflow(workflowId);
      sendJson(res, 200, { ok: true, data: alerts });
      return;
    }
    if (workflowId && !url.pathname.endsWith('/validate') && !url.pathname.endsWith('/draft') && !url.pathname.endsWith('/publish') && !url.pathname.endsWith('/runs')) {
      const workflow = getWorkflowById(workflowId);
      if (!workflow) {
        sendJson(res, 404, { ok: false, message: 'workflow not found' });
        return;
      }
      sendJson(res, 200, { ok: true, data: workflow });
      return;
    }
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/workflows/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 4 && parts[3] === 'clone') {
      const cloned = cloneWorkflow(parts[2]);
      if (!cloned) {
        sendJson(res, 404, { ok: false, message: 'workflow not found' });
        return;
      }
      sendJson(res, 200, { ok: true, data: cloned });
      return;
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/jobs') {
    const result = listJobs(Object.fromEntries(url.searchParams.entries()));
    sendJson(res, 200, { ok: true, ...result });
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/jobs/')) {
    const jobId = url.pathname.split('/').filter(Boolean)[2];
    const job = getJobById(jobId);
    if (!job) {
      sendJson(res, 404, { ok: false, message: 'job not found' });
      return;
    }
    sendJson(res, 200, { ok: true, data: job });
    return;
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/jobs/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    const jobId = parts[2];
    if (parts.length === 4 && parts[3] === 'clone') {
      const cloned = cloneJob(jobId);
      if (!cloned) {
        sendJson(res, 404, { ok: false, message: 'job not found' });
        return;
      }
      sendJson(res, 200, { ok: true, data: cloned });
      return;
    }
    if (parts.length === 4 && (parts[3] === 'enable' || parts[3] === 'disable')) {
      const nextStatus = parts[3] === 'enable' ? 'enabled' : 'disabled';
      const updated = setJobStatus(jobId, nextStatus);
      if (!updated) {
        sendJson(res, 404, { ok: false, message: 'job not found' });
        return;
      }
      sendJson(res, 200, { ok: true, data: updated });
      return;
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/workflows/validate') {
    try {
      const body = await parseBody(req);
      const issues = validateWorkflowGraph(body.nodes ?? [], body.edges ?? []);
      sendJson(res, 200, { ok: issues.length === 0, issues });
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  const validateId = workflowIdFromPath(url.pathname, 'validate');
  if (req.method === 'POST' && validateId) {
    try {
      const body = await parseBody(req);
      const issues = validateWorkflowGraph(body.nodes ?? [], body.edges ?? []);
      sendJson(res, 200, { ok: issues.length === 0, workflowId: validateId, issues });
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  const draftId = workflowIdFromPath(url.pathname, 'draft');
  if (req.method === 'POST' && draftId) {
    try {
      const body = await parseBody(req);
      const draft = upsertWorkflowDraft({
        workflowId: draftId,
        workflowName: body.workflowName ?? draftId,
        nodes: body.nodes ?? [],
        edges: body.edges ?? [],
      });
      sendJson(res, 200, { ok: true, workflowId: draftId, savedAt: draft.savedAt });
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  const publishId = workflowIdFromPath(url.pathname, 'publish');
  if (req.method === 'POST' && publishId) {
    try {
      const body = await parseBody(req);
      const issues = validateWorkflowGraph(body.nodes ?? [], body.edges ?? []);
      if (issues.length > 0) {
        sendJson(res, 422, { ok: false, workflowId: publishId, issues });
        return;
      }
      const published = publishWorkflowVersion({
        workflowId: publishId,
        workflowName: body.workflowName ?? publishId,
        nodes: body.nodes ?? [],
        edges: body.edges ?? [],
      });
      sendJson(res, 200, {
        ok: true,
        workflowId: publishId,
        publishedVersion: published.versionNo,
        publishedAt: published.publishedAt,
      });
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  const runId = workflowIdFromPath(url.pathname, 'runs');
  if (req.method === 'POST' && runId) {
    try {
      const body = await parseBody(req);
      const issues = validateWorkflowGraph(body.nodes ?? [], body.edges ?? []);
      const run = createRun({
        workflowId: runId,
        workflowName: body.workflowName ?? runId,
        status: issues.length > 0 ? 'failed' : 'success',
        issues,
      });
      sendJson(res, 200, {
        ok: issues.length === 0,
        workflowId: runId,
        runId: run.runId,
        status: run.status,
        issues,
      });
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  sendJson(res, 404, { ok: false, message: `Not found: ${req.method} ${url.pathname}` });
});

server.listen(port, () => {
  console.log(`Workflow API listening on http://localhost:${port}`);
});
