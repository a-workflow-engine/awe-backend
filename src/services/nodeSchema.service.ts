import type {
  DecisionNodeConfiguration,
  EndNodeConfiguration,
  Node,
  NodeConfiguration,
  NodeInputSchema,
  NodeOuputSchema,
  ScriptNodeConfiguration,
  ServiceNodeConfiguration,
  StartNodeConfiguration,
  UserNodeConfiguration,
} from "../types/workflow.js";
import { NodeTypes } from "../types/enums.js";
import { NodeSchema } from "../schemas/node.schema.js";
import type { NodeModel } from "../types/models.js";
import { converterUtils } from "../utils/converter.utils.js";
import type { NodeType } from "../types/database.js";

function extractVariableNames(
  expression: string,
  contextSet: Set<string>,
  secretSet: Set<string>,
): void {
  for (const result of expression.matchAll(/(?<=context\.)\w*/g)) {
    contextSet.add(result[0]);
  }

  for (const result of expression.matchAll(/(?<=secret\.)\w*/g)) {
    secretSet.add(result[0]);
  }
}

type SchemaResult = {
  inputSchema: NodeInputSchema;
  outputSchema: NodeOuputSchema;
};

function buildSchema(params: {
  expressions?: string[];
  outputVariables?: string[];
  includeSecrets?: boolean;
}): SchemaResult {
  const inputVars = new Set<string>();
  const inputSecrets = new Set<string>();
  const outputVars = new Set(params.outputVariables ?? []);

  for (const expr of params.expressions ?? []) {
    extractVariableNames(expr, inputVars, inputSecrets);
  }

  return {
    inputSchema: {
      variableNames: [...inputVars],
      secretNames: params.includeSecrets === true ? [...inputSecrets] : [],
    },
    outputSchema: {
      variableNames: [...outputVars],
    },
  };
}

function getStartSchema(config: StartNodeConfiguration): SchemaResult {
  return {
    inputSchema: {
      variableNames: config.inputDataMap
        .filter((i) => i.fetchableId === undefined)
        .map((i) => i.contextVariableName),
      secretNames: config.secretDataMap.map((s) => s.secretVariableName),
    },
    outputSchema: {
      variableNames: config.inputDataMap.map((i) => i.contextVariableName),
    },
  };
}

function getUserSchema(config: UserNodeConfiguration): SchemaResult {
  return buildSchema({
    expressions: [
      ...config.requestMap.map((r) => r.valueExpression),
      ...(config.assignee ? [config.assignee] : []),
    ],
    outputVariables: config.responseMap.map((r) => r.contextVariableName),
  });
}

function getServiceSchema(config: ServiceNodeConfiguration): SchemaResult {
  return buildSchema({
    expressions: [
      config.urlExpression,
      ...(config.body?.map((b) => b.valueExpression) ?? []),
    ],
    outputVariables: config.responseMap.map((r) => r.contextVariableName),
    includeSecrets: true,
  });
}

function getScriptSchema(config: ScriptNodeConfiguration): SchemaResult {
  return buildSchema({
    expressions: config.parameterMap.map((p) => p.valueExpression),
    outputVariables: config.responseMap.map((r) => r.contextVariableName),
    includeSecrets: true,
  });
}

function getDecisionSchema(config: DecisionNodeConfiguration): SchemaResult {
  return buildSchema({
    expressions: config.rules.map((r) => r.conditionExpression),
  });
}

function getEndSchema(config: EndNodeConfiguration): SchemaResult {
  return buildSchema({
    expressions: config.resultMap.map((r) => r.valueExpression),
  });
}

type SchemaGetters = {
  [K in NodeType]: (config: NodeConfiguration<K>) => SchemaResult;
};

const schemaGetters: SchemaGetters = {
  start: getStartSchema,
  service: getServiceSchema,
  script: getScriptSchema,
  user: getUserSchema,
  decision: getDecisionSchema,
  end: getEndSchema,
};

export const nodeSchemaService = {
  getNodeSchema: (node: NodeModel): Node => {
    const nodeObject = {
      id: node.client_id,
      label: node.name,
      description: node.description,
      position:
        node.x_coordinate && node.y_coordinate
          ? { x: node.x_coordinate, y: node.y_coordinate }
          : null,
      type: node.type,
      configuration: node.configuration,
    };

    return converterUtils.parseOrThrow(NodeSchema, nodeObject);
  },

  getInputOutputSchemas: (
    node: Node,
  ): {
    inputSchema: NodeInputSchema;
    outputSchema: NodeOuputSchema;
  } => {
    return (
      schemaGetters[node.type] as (
        config: NodeConfiguration<typeof node.type>,
      ) => SchemaResult
    )(node.configuration);
  },
};
