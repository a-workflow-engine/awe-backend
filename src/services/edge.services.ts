import type { Transaction } from "kysely";
import type { ActorModel, EdgeModel, NodeModel } from "../types/models.js";
import type { DecisionNodeConfiguration, Edge } from "../types/workflow.js";
import type { DB } from "../types/database.js";
import {
  edgeRepository,
  type NewEdge,
} from "../repositories/edge.repository.js";
import { NodeTypes } from "../types/enums.js";

const findNodesByEdge = (
  nodes: NodeModel[],
  edge: Edge,
): [NodeModel | null, NodeModel | null] => {
  let source = null;
  let destination = null;

  edge.sourceNodeId;
  edge.targetNodeId;

  for (let node of nodes) {
    if (node.client_id === edge.sourceNodeId) {
      source = node;
    }
    if (node.client_id === edge.targetNodeId) {
      destination = node;
    }

    if (source && destination) {
      break;
    }
  }

  return [source, destination];
};

const getConditionExpressionForEdge = (
  sourceNode: NodeModel,
  edge: Edge,
): string | null => {
  if (sourceNode.type !== NodeTypes.DECISION) {
    return null;
  }

  const sourceNodeConfig = sourceNode.configuration;
  const decisionNode = (
    typeof sourceNodeConfig === "string"
      ? JSON.parse(sourceNodeConfig)
      : sourceNodeConfig
  ) as DecisionNodeConfiguration;

  if (edge.ruleId === decisionNode.defaultRule.id) {
    return null;
  }

  for (let rule of decisionNode.rules) {
    if (edge.ruleId === rule.id) {
      return rule.conditionExpression;
    }
  }

  return null;
};
export const edgeService = {
  createMany: async (
    edges: Edge[],
    nodes: NodeModel[],
    actor: ActorModel,
    transaction?: Transaction<DB>,
  ): Promise<EdgeModel[]> => {
    const insertEdges: NewEdge[] = edges.map((edge) => {
      const [sourceNode, destinationNode] = findNodesByEdge(nodes, edge);
      let condition_expression = null;

      if (sourceNode) {
        condition_expression = getConditionExpressionForEdge(sourceNode, edge);
      }

      return {
        client_id: edge.id,
        name: edge.label ?? null,
        source_node_id: sourceNode?.id ?? null,
        destination_node_id: destinationNode?.id ?? null,
        condition_expression: condition_expression,
        created_by: actor.id,
        modified_by: actor.id,
        is_deleted: false,
      };
    });

    return await edgeRepository.insertMany(insertEdges, transaction);
  },
};
