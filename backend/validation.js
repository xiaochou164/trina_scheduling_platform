export function validateWorkflowGraph(nodes, edges) {
  const issues = [];
  const startNodes = nodes.filter((node) => node.type === 'start');
  const endNodes = nodes.filter((node) => node.type === 'end');

  if (startNodes.length !== 1) {
    issues.push({ code: 'START_NODE_INVALID', message: '必须且仅能有 1 个开始节点' });
  }
  if (endNodes.length < 1) {
    issues.push({ code: 'END_NODE_MISSING', message: '至少需要 1 个结束节点' });
  }

  const outboundMap = new Map();
  const inboundMap = new Map();
  for (const edge of edges) {
    outboundMap.set(edge.from, (outboundMap.get(edge.from) ?? 0) + 1);
    inboundMap.set(edge.to, (inboundMap.get(edge.to) ?? 0) + 1);
  }

  for (const node of nodes) {
    if (node.type !== 'start' && !inboundMap.get(node.id)) {
      issues.push({
        code: 'NODE_INBOUND_MISSING',
        nodeId: node.id,
        message: `节点「${node.label}」缺少入边`,
      });
    }
    if (node.type !== 'end' && !outboundMap.get(node.id)) {
      issues.push({
        code: 'NODE_OUTBOUND_MISSING',
        nodeId: node.id,
        message: `节点「${node.label}」缺少出边`,
      });
    }
  }

  return issues;
}
