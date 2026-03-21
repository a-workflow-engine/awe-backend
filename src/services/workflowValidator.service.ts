import { DataIntegrityError } from "../errors/DataIntegrity.js";
import { NodeTypes } from "../types/enums.js";
import type { NodeModel, EdgeModel } from "../types/models.js";
import type {
  StartNodeConfiguration,
  EndNodeConfiguration,
  UserNodeConfiguration,
  ServiceNodeConfiguration,
  ScriptNodeConfiguration,
  DecisionNodeConfiguration,
} from "../types/workflow.js";
import { graphUtils } from "../utils/graph.utils.js";
import {
  validateFeelExpression,
  validateUrlExpression,
  validateConditionExpression,
} from "../utils/feel.utils.js";

export type ValidationError = {
  code: number;
  message: string;
  nodeId?: string;
  edgeId?: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

export enum ValidationErrorCode {
  START_NODE_MISSING_OR_MULTIPLE,
  END_NODE_MISSING,

  EDGE_TARGET_NODE_MISSING,
  EDGE_SOURCE_AND_TARGET_EQUAL,
  EDGE_SOURCE_NODE_IS_END,
  EDGE_TARGET_NODE_IS_START,

  WORKFLOW_CONTAINS_CYCLE,
  UNREACHABLE_NODE,
  DEAD_END_NODE,

  NODE_MISSING_REQUIRED_CONFIGURATION,
  INVALID_FEEL_EXPRESSION,

  DECISION_NODE_MISSING_RULES,
  DECISION_MISSING_DEFAULT_EDGE,
  DECISION_RULES_EDGE_MISMATCH,
}

function getConfiguration<T>(configuration: unknown): T {
  return (
    typeof configuration === "string"
      ? JSON.parse(configuration)
      : configuration
  ) as T;
}

type ExpressionValidator = (expr: string) => { valid: boolean; error?: string };

function validateExpression(
  expression: string | undefined,
  nodeId: string,
  messagePrefix: string,
  errors: ValidationError[],
  validator: ExpressionValidator = validateFeelExpression,
): void {
  if (!expression?.trim()) return;

  const result = validator(expression);
  if (!result.valid) {
    errors.push({
      code: ValidationErrorCode.INVALID_FEEL_EXPRESSION,
      message: `${messagePrefix} - ${result.error}`,
      nodeId,
    });
  }
}

function validateRequired(
  value: string | undefined,
  nodeId: string,
  message: string,
  errors: ValidationError[],
): boolean {
  if (!value?.trim()) {
    errors.push({
      code: ValidationErrorCode.NODE_MISSING_REQUIRED_CONFIGURATION,
      message,
      nodeId,
    });
    return false;
  }
  return true;
}

function validateHeaders(
  headers: Array<{ valueExpression: string }> | undefined,
  nodeId: string,
  messagePrefix: string,
  errors: ValidationError[],
): void {
  headers?.forEach((header, index) => {
    validateExpression(
      header.valueExpression,
      nodeId,
      `${messagePrefix} header ${index + 1}: invalid value expression`,
      errors,
    );
  });
}

function validateValueExpressions(
  items: Array<{ valueExpression: string }> | undefined,
  nodeId: string,
  messagePrefix: string,
  errors: ValidationError[],
): void {
  items?.forEach((item, index) => {
    validateExpression(
      item.valueExpression,
      nodeId,
      `${messagePrefix} ${index + 1}: invalid value expression`,
      errors,
    );
  });
}

function validateResponseMapExpressions(
  responseMap: Array<{ validationExpression?: string | undefined }>,
  nodeId: string,
  messagePrefix: string,
  errors: ValidationError[],
): void {
  responseMap.forEach((entry, index) => {
    validateExpression(
      entry.validationExpression,
      nodeId,
      `${messagePrefix} ${index + 1}: invalid validation expression`,
      errors,
    );
  });
}

function validateOnErrorMap(
  onError:
    | "terminate"
    | { errorMap: Array<Record<string, unknown>> }
    | undefined,
  nodeId: string,
  messagePrefix: string,
  errors: ValidationError[],
): void {
  if (!onError || typeof onError !== "object") return;

  onError.errorMap.forEach((entry, index) => {
    if (
      "valueExpression" in entry &&
      typeof entry.valueExpression === "string"
    ) {
      validateExpression(
        entry.valueExpression,
        nodeId,
        `${messagePrefix} error map ${index + 1}: invalid value expression`,
        errors,
      );
    }
  });
}

function validateStartNode(node: NodeModel): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = getConfiguration<StartNodeConfiguration>(node.configuration);

  config.inputDataMap.forEach((entry, index) => {
    validateRequired(
      entry.jsonPath,
      node.client_id,
      `Start node input ${index + 1}: jsonPath must not be empty`,
      errors,
    );
    validateRequired(
      entry.contextVariableName,
      node.client_id,
      `Start node input ${index + 1}: context variable name must not be empty`,
      errors,
    );
  });

  config.fetchables.forEach((fetchable, fIndex) => {
    validateExpression(
      fetchable.urlExpression,
      node.client_id,
      `Start node fetchable ${fIndex + 1}: invalid URL expression`,
      errors,
      validateUrlExpression,
    );
    validateHeaders(
      fetchable.headers,
      node.client_id,
      `Start node fetchable ${fIndex + 1}`,
      errors,
    );
  });

  return errors;
}

function validateEndNode(node: NodeModel): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = getConfiguration<EndNodeConfiguration>(node.configuration);

  config.resultMap.forEach((entry, index) => {
    validateRequired(
      entry.contextVariable.name,
      node.client_id,
      `End node result ${index + 1}: context variable name must not be empty`,
      errors,
    );

    const hasValue = validateRequired(
      entry.valueExpression,
      node.client_id,
      `End node result ${index + 1}: value expression must not be empty`,
      errors,
    );

    if (hasValue) {
      validateExpression(
        entry.valueExpression,
        node.client_id,
        `End node result ${index + 1}: invalid value expression`,
        errors,
      );
    }

    validateExpression(
      entry.validationExpression,
      node.client_id,
      `End node result ${index + 1}: invalid validation expression`,
      errors,
    );
  });

  return errors;
}

function validateUserNode(node: NodeModel): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = getConfiguration<UserNodeConfiguration>(node.configuration);

  config.requestMap.forEach((entry, index) => {
    const hasValue = validateRequired(
      entry.valueExpression,
      node.client_id,
      `User task request field ${index + 1}: value expression must not be empty`,
      errors,
    );

    if (hasValue) {
      validateExpression(
        entry.valueExpression,
        node.client_id,
        `User task request field ${index + 1}: invalid value expression`,
        errors,
      );
    }
  });

  config.responseMap.forEach((entry, index) => {
    validateRequired(
      entry.fieldId,
      node.client_id,
      `User task response field ${index + 1}: field ID must not be empty`,
      errors,
    );

    entry.options?.forEach((option, optIndex) => {
      validateExpression(
        option.valueExpression,
        node.client_id,
        `User task response field ${index + 1} option ${optIndex + 1}: invalid value expression`,
        errors,
      );
    });

    validateExpression(
      entry.validationExpression,
      node.client_id,
      `User task response field ${index + 1}: invalid validation expression`,
      errors,
    );
  });

  validateExpression(
    config.assignee,
    node.client_id,
    "User task: invalid assignee expression",
    errors,
  );

  return errors;
}

function validateServiceNode(node: NodeModel): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = getConfiguration<ServiceNodeConfiguration>(node.configuration);

  const hasUrl = validateRequired(
    config.urlExpression,
    node.client_id,
    "Service task URL expression must not be empty",
    errors,
  );

  if (hasUrl) {
    validateExpression(
      config.urlExpression,
      node.client_id,
      "Service task: invalid URL expression",
      errors,
      validateUrlExpression,
    );
  }

  validateValueExpressions(
    config.body,
    node.client_id,
    "Service task body field",
    errors,
  );
  validateHeaders(config.headers, node.client_id, "Service task", errors);
  validateResponseMapExpressions(
    config.responseMap,
    node.client_id,
    "Service task response",
    errors,
  );
  validateOnErrorMap(config.onError, node.client_id, "Service task", errors);

  return errors;
}

function validateScriptNode(node: NodeModel): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = getConfiguration<ScriptNodeConfiguration>(node.configuration);

  validateRequired(
    config.sourceCode,
    node.client_id,
    "Script task source code must not be empty",
    errors,
  );

  validateRequired(
    config.entryFunctionName,
    node.client_id,
    "Script task entry function name must not be empty",
    errors,
  );

  validateValueExpressions(
    config.parameterMap,
    node.client_id,
    "Script task parameter",
    errors,
  );
  validateResponseMapExpressions(
    config.responseMap,
    node.client_id,
    "Script task response",
    errors,
  );
  validateOnErrorMap(config.onError, node.client_id, "Script task", errors);

  return errors;
}

function validateDecisionNode(node: NodeModel): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = getConfiguration<DecisionNodeConfiguration>(
    node.configuration,
  );

  if (config.rules.length === 0) {
    errors.push({
      code: ValidationErrorCode.DECISION_NODE_MISSING_RULES,
      message: "Decision node must have at least one conditional rule",
      nodeId: node.client_id,
    });
    return errors;
  }

  config.rules.forEach((rule, index) => {
    const hasCondition = validateRequired(
      rule.conditionExpression,
      node.client_id,
      `Decision node rule ${index + 1}: condition expression must not be empty`,
      errors,
    );

    if (hasCondition) {
      validateExpression(
        rule.conditionExpression,
        node.client_id,
        `Decision node rule ${index + 1}: invalid condition expression`,
        errors,
        validateConditionExpression,
      );
    }
  });

  return errors;
}

export const workflowValidatorService = {
  validate: (nodes: NodeModel[], edges: EdgeModel[]): ValidationResult => {
    const errors = [
      ...workflowValidatorService.validateAllNodes(nodes),
      ...workflowValidatorService.validateAllEdges(nodes, edges),
    ];

    if (errors.length === 0) {
      errors.push(
        ...workflowValidatorService.validateDecisionEdges(nodes, edges),
        ...workflowValidatorService.validateGraph(nodes, edges),
      );
    }

    return { valid: errors.length === 0, errors };
  },

  validateAllNodes: (nodes: NodeModel[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    let startNodes = 0;
    let endNodes = 0;

    const validators: Record<string, (node: NodeModel) => ValidationError[]> = {
      [NodeTypes.START]: validateStartNode,
      [NodeTypes.END]: validateEndNode,
      [NodeTypes.USER]: validateUserNode,
      [NodeTypes.SERVICE]: validateServiceNode,
      [NodeTypes.SCRIPT]: validateScriptNode,
      [NodeTypes.DECISION]: validateDecisionNode,
    };

    for (const node of nodes) {
      if (node.type === NodeTypes.START) startNodes++;
      if (node.type === NodeTypes.END) endNodes++;

      const validator = validators[node.type];
      if (validator) {
        errors.push(...validator(node));
      }
    }

    if (startNodes !== 1) {
      errors.push({
        code: ValidationErrorCode.START_NODE_MISSING_OR_MULTIPLE,
        message: "Workflow must contain exactly one start node",
      });
    }

    if (endNodes === 0) {
      errors.push({
        code: ValidationErrorCode.END_NODE_MISSING,
        message: "Workflow must contain at least one end node",
      });
    }

    return errors;
  },

  validateAllEdges: (
    nodes: NodeModel[],
    edges: EdgeModel[],
  ): ValidationError[] => {
    const errors: ValidationError[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    for (const edge of edges) {
      if (!edge.destination_node_id) {
        errors.push({
          code: ValidationErrorCode.EDGE_TARGET_NODE_MISSING,
          message: "Every edge must have a target node",
          edgeId: edge.client_id,
        });
        continue;
      }

      const targetNode = nodeMap.get(edge.destination_node_id);
      if (!targetNode) {
        throw new DataIntegrityError(
          `Target node id=${edge.destination_node_id} does not exist`,
        );
      }

      if (targetNode.type === NodeTypes.START) {
        errors.push({
          code: ValidationErrorCode.EDGE_TARGET_NODE_IS_START,
          message: "Edge cannot target start node",
          edgeId: edge.client_id,
          nodeId: targetNode.client_id,
        });
      }

      if (edge.source_node_id === edge.destination_node_id) {
        errors.push({
          code: ValidationErrorCode.EDGE_SOURCE_AND_TARGET_EQUAL,
          message: "Source and target nodes cannot be same",
          edgeId: edge.client_id,
        });
      }

      const sourceNode = nodeMap.get(edge.source_node_id);
      if (!sourceNode) {
        throw new DataIntegrityError(
          `Source node id=${edge.source_node_id} does not exist`,
        );
      }

      if (sourceNode.type === NodeTypes.END) {
        errors.push({
          code: ValidationErrorCode.EDGE_SOURCE_NODE_IS_END,
          message: "Edge cannot originate from end node",
          edgeId: edge.client_id,
          nodeId: sourceNode.client_id,
        });
      }
    }

    return errors;
  },

  validateDecisionEdges: (
    nodes: NodeModel[],
    edges: EdgeModel[],
  ): ValidationError[] => {
    const errors: ValidationError[] = [];

    const outgoingEdges = new Map<string, EdgeModel[]>();
    for (const edge of edges) {
      const group = outgoingEdges.get(edge.source_node_id) ?? [];
      group.push(edge);
      outgoingEdges.set(edge.source_node_id, group);
    }

    for (const node of nodes) {
      if (node.type !== NodeTypes.DECISION) continue;

      const config = getConfiguration<DecisionNodeConfiguration>(
        node.configuration,
      );
      const nodeOutgoingEdges = outgoingEdges.get(node.id) ?? [];

      const defaultEdgeCount = nodeOutgoingEdges.filter(
        (e) => e.condition_expression === null,
      ).length;

      if (defaultEdgeCount !== 1) {
        errors.push({
          code: ValidationErrorCode.DECISION_MISSING_DEFAULT_EDGE,
          message:
            defaultEdgeCount === 0
              ? "Decision node must have exactly one default outgoing edge"
              : "Decision node has more than one default outgoing edge",
          nodeId: node.client_id,
        });
      }

      const conditionalEdgeCount = nodeOutgoingEdges.filter(
        (e) => e.condition_expression !== null,
      ).length;

      if (conditionalEdgeCount !== config.rules.length) {
        errors.push({
          code: ValidationErrorCode.DECISION_RULES_EDGE_MISMATCH,
          message: `Decision node has ${config.rules.length} rule(s) but ${conditionalEdgeCount} conditional outgoing edge(s)`,
          nodeId: node.client_id,
        });
      }
    }

    return errors;
  },

  validateGraph: (
    nodes: NodeModel[],
    edges: EdgeModel[],
  ): ValidationError[] => {
    const errors: ValidationError[] = [];
    const graph = graphUtils.buildGraph(nodes, edges);

    if (graphUtils.detectCycle(nodes, graph)) {
      errors.push({
        code: ValidationErrorCode.WORKFLOW_CONTAINS_CYCLE,
        message: "Workflow contains a cycle",
      });
    }

    const startNode = nodes.find((n) => n.type === NodeTypes.START);
    if (!startNode) return errors;

    const reachable = graphUtils.reachableFrom(startNode.id, graph);

    for (const node of nodes) {
      if (!reachable.has(node.id)) {
        errors.push({
          code: ValidationErrorCode.UNREACHABLE_NODE,
          message: "Node is unreachable from start node",
          nodeId: node.client_id,
        });
      }
    }

    for (const node of nodes) {
      if (node.type === NodeTypes.END) continue;

      const out = graph.adjacency.get(node.id) ?? [];
      if (out.length === 0) {
        errors.push({
          code: ValidationErrorCode.DEAD_END_NODE,
          message: "Node has no outgoing edges",
          nodeId: node.client_id,
        });
      }
    }

    return errors;
  },
};
