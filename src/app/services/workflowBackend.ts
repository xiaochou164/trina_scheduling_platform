import type { WorkflowEdge, WorkflowNode } from '../components/WorkflowCanvas';

export interface WorkflowValidationIssue {
  code: 'START_NODE_INVALID' | 'END_NODE_MISSING' | 'NODE_INBOUND_MISSING' | 'NODE_OUTBOUND_MISSING';
  message: string;
  nodeId?: string;
}

const API_BASE = '/api';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message ?? `Request failed: ${response.status}`);
  }
  return data as T;
}

export async function validateWorkflowGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const data = await postJson<{ ok: boolean; issues: WorkflowValidationIssue[] }>(
    '/workflows/validate',
    { nodes, edges },
  );
  return data.issues;
}

export async function saveWorkflowDraft(payload: {
  workflowId: string;
  workflowName: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}) {
  return postJson<{ ok: boolean; workflowId: string; savedAt: string }>(
    `/workflows/${payload.workflowId}/draft`,
    payload,
  );
}

export async function publishWorkflow(payload: {
  workflowId: string;
  workflowName: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}): Promise<
  | { ok: true; workflowId: string; publishedVersion: string; publishedAt: string }
  | { ok: false; workflowId: string; issues: WorkflowValidationIssue[] }
> {
  const response = await fetch(`${API_BASE}/workflows/${payload.workflowId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (response.status === 422) {
    return data as { ok: false; workflowId: string; issues: WorkflowValidationIssue[] };
  }
  if (!response.ok) {
    throw new Error(data?.message ?? `Request failed: ${response.status}`);
  }
  return data as { ok: true; workflowId: string; publishedVersion: string; publishedAt: string };
}

export async function triggerWorkflowRun(payload: {
  workflowId: string;
  workflowName: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}) {
  return postJson<{
    ok: boolean;
    workflowId: string;
    runId: string;
    status: 'success' | 'failed';
    issues: WorkflowValidationIssue[];
  }>(`/workflows/${payload.workflowId}/runs`, payload);
}
