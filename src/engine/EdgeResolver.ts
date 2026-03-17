import { evaluate } from "@bpmn-io/feelin";
import type { EdgeModel, NodeModel } from "../types/models.js";
import type { WorkflowContext } from "./types.js";
import { NodeTypes } from "../types/enums.js";
import { buildFeelContext } from "../utils/contextResolver.js";
import { executionLogger } from "../utils/executionLogger.js";

function normalizeFeelExpression(expr: string): string {
  const parts = expr.split(/("(?:[^"\\]|\\.)*")/);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      parts[i] = parts[i].replace(/(?<![!<>])={2,}/g, "=");
    }
  }
  return parts.join("");
}

export const edgeResolver = {
  async resolveNextNodeIds(
    completedNodeId: string,
    context: WorkflowContext,
    edges: EdgeModel[],
    nodes: NodeModel[],
    instanceId?: string,
  ): Promise<string[]> {
    const completedNode = nodes.find((n) => n.id === completedNodeId);
    const outgoing = edges.filter(
      (e) =>
        e.source_node_id === completedNodeId && e.destination_node_id !== null,
    );

    if (outgoing.length === 0) return [];

    if (completedNode?.type === NodeTypes.DECISION) {
      return evaluateDecisionEdges(
        outgoing,
        context,
        completedNodeId,
        instanceId,
      );
    }

    return outgoing
      .map((e) => e.destination_node_id)
      .filter((id): id is string => id !== null);
  },
};

async function evaluateDecisionEdges(
  outgoing: EdgeModel[],
  context: WorkflowContext,
  nodeId: string,
  instanceId?: string,
): Promise<string[]> {
  const feelContext = await buildFeelContext(context);

  const conditional = outgoing.filter((e) => e.condition_expression !== null);
  const defaultEdge = outgoing.find((e) => e.condition_expression === null);

  const evaluations: {
    expression: string;
    result: unknown;
    matched: boolean;
    destNodeId: string;
  }[] = [];

  const matched = conditional
    .filter((e) => {
      const normalized = normalizeFeelExpression(e.condition_expression!);
      const evalResult = evaluate(normalized, feelContext);
      const isMatch = evalResult.value === true;
      evaluations.push({
        expression: e.condition_expression!,
        result: evalResult.value,
        matched: isMatch,
        destNodeId: e.destination_node_id ?? "(unknown)",
      });
      return isMatch;
    })
    .map((e) => e.destination_node_id)
    .filter((id): id is string => id !== null);

  const usedDefault =
    matched.length === 0 && !!defaultEdge?.destination_node_id;
  const selectedIds =
    matched.length > 0
      ? matched
      : defaultEdge?.destination_node_id
      ? [defaultEdge.destination_node_id]
      : [];

  executionLogger.decisionEvaluation({
    instanceId: instanceId ?? "(unknown)",
    nodeId,
    feelCtxKeys: Object.keys(feelContext.context ?? {}),
    evaluations,
    selectedIds,
    usedDefault,
  });

  if (matched.length > 0) return matched;

  if (defaultEdge?.destination_node_id) {
    return [defaultEdge.destination_node_id];
  }

  return [];
}
