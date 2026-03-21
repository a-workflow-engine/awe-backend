import type {
  DecisionNodeConfiguration,
  EndNodeConfiguration,
  Node,
  NodeInputSchema,
  NodeOuputSchema,
  ScriptNodeConfiguration,
  ServiceNodeConfiguration,
  StartNodeConfiguration,
  UserNodeConfiguration,
} from "../types/workflow.js";
import { NodeTypes } from "../types/enums.js";
import {
  StartNodeConfigurationSchema,
  UserNodeConfigurationSchema,
  ScriptNodeConfigurationSchema,
  ServiceNodeConfigurationSchema,
  EndNodeConfigurationSchema,
  DecisionNodeConfigurationSchema,
} from "../schemas/node.schema.js";
import type { NodeModel } from "../types/models.js";

export const nodeSchemaService = {
  getNodeSchema: (node: NodeModel): Node => {
    const base = {
      id: node.client_id,
      label: node.name,
      description: node.description,
      position:
        node.x_coordinate && node.y_coordinate
          ? { x: node.x_coordinate, y: node.y_coordinate }
          : null,
    };

    switch (node.type) {
      case NodeTypes.START:
        return {
          ...base,
          type: NodeTypes.START,
          configuration: StartNodeConfigurationSchema.parse(node.configuration),
        };

      case NodeTypes.USER:
        return {
          ...base,
          type: NodeTypes.USER,
          configuration: UserNodeConfigurationSchema.parse(node.configuration),
        };

      case NodeTypes.SERVICE:
        return {
          ...base,
          type: NodeTypes.SERVICE,
          configuration: ServiceNodeConfigurationSchema.parse(
            node.configuration,
          ),
        };

      case NodeTypes.SCRIPT:
        return {
          ...base,
          type: NodeTypes.SCRIPT,
          configuration: ScriptNodeConfigurationSchema.parse(
            node.configuration,
          ),
        };

      case NodeTypes.DECISION:
        return {
          ...base,
          type: NodeTypes.DECISION,
          configuration: DecisionNodeConfigurationSchema.parse(
            node.configuration,
          ),
        };

      case NodeTypes.END:
        return {
          ...base,
          type: NodeTypes.END,
          configuration: EndNodeConfigurationSchema.parse(node.configuration),
        };
    }
  },

  getInputOutputSchemas: (
    node: Node,
  ): {
    inputSchema: NodeInputSchema;
    outputSchema: NodeOuputSchema;
  } => {
    switch (node.type) {
      case NodeTypes.START:
        return nodeSchemaService._getInputOuputSchemasForStartNode(
          node.configuration,
        );

      case NodeTypes.USER:
        return nodeSchemaService._getInputOuputSchemasForUserNode(
          node.configuration,
        );

      case NodeTypes.SERVICE:
        return nodeSchemaService._getInputOutputSchemasForServiceNode(
          node.configuration,
        );

      case NodeTypes.SCRIPT:
        return nodeSchemaService._getInputOuputSchemasForScriptNode(
          node.configuration,
        );

      case NodeTypes.DECISION:
        return nodeSchemaService._getInputOutputSchemasForDecisionNode(
          node.configuration,
        );

      case NodeTypes.END:
        return nodeSchemaService._getInputOutputSchemasForEndNode(
          node.configuration,
        );

      default:
        throw new Error(
          `Input schema evaluation not implemented for node = ${node}`,
        );
    }
  },

  _updateNameSetForExpression: (
    nameSet: Set<string>,
    expression: string,
  ): void => {
    const iterator = expression.matchAll(/(?<=context\.)\w*/g);

    for (const result of iterator) {
      nameSet.add(result[0]);
    }
  },

  _getInputOuputSchemasForStartNode: (
    configuration: StartNodeConfiguration,
  ): {
    inputSchema: NodeInputSchema;
    outputSchema: NodeOuputSchema;
  } => {
    const inputVariableSet = new Set<string>();
    const outputVariableSet = new Set<string>();

    configuration.inputDataMap.forEach((input) => {
      const variableName = input.contextVariableName;

      if (input.fetchableId === undefined) {
        inputVariableSet.add(variableName);
      }

      outputVariableSet.add(variableName);
    });

    return {
      inputSchema: {
        variableNames: [...inputVariableSet],
      },
      outputSchema: {
        variableNames: [...outputVariableSet],
      },
    };
  },

  _getInputOuputSchemasForUserNode: (
    configuration: UserNodeConfiguration,
  ): {
    inputSchema: NodeInputSchema;
    outputSchema: NodeOuputSchema;
  } => {
    const inputVariableSet = new Set<string>();
    const outputVariableSet = new Set<string>();

    configuration.requestMap.forEach((data) => {
      nodeSchemaService._updateNameSetForExpression(
        inputVariableSet,
        data.valueExpression,
      );
    });

    configuration.responseMap.forEach((data) => {
      if (data.contextVariable) {
        outputVariableSet.add(data.contextVariable.name);
      }
    });

    return {
      inputSchema: {
        variableNames: [...inputVariableSet],
      },
      outputSchema: {
        variableNames: [...outputVariableSet],
      },
    };
  },

  _getInputOutputSchemasForServiceNode: (
    configuration: ServiceNodeConfiguration,
  ): {
    inputSchema: NodeInputSchema;
    outputSchema: NodeOuputSchema;
  } => {
    const inputVariableSet = new Set<string>();
    const outputVariableSet = new Set<string>();

    if (configuration.body) {
      configuration.body.forEach((data) =>
        nodeSchemaService._updateNameSetForExpression(
          inputVariableSet,
          data.valueExpression,
        ),
      );
    }

    configuration.responseMap.forEach((data) => {
      if (data.contextVariable) {
        outputVariableSet.add(data.contextVariable.name);
      }
    });

    return {
      inputSchema: {
        variableNames: [...inputVariableSet],
      },
      outputSchema: {
        variableNames: [...outputVariableSet],
      },
    };
  },

  _getInputOuputSchemasForScriptNode: (
    configuration: ScriptNodeConfiguration,
  ): {
    inputSchema: NodeInputSchema;
    outputSchema: NodeOuputSchema;
  } => {
    const inputVariableSet = new Set<string>();
    const outputVariableSet = new Set<string>();

    configuration.parameterMap.forEach((data) => {
      nodeSchemaService._updateNameSetForExpression(
        inputVariableSet,
        data.valueExpression,
      );
    });

    configuration.responseMap.forEach((data) => {
      if (data.contextVariable) {
        outputVariableSet.add(data.contextVariable.name);
      }
    });

    return {
      inputSchema: {
        variableNames: [...inputVariableSet],
      },
      outputSchema: {
        variableNames: [...outputVariableSet],
      },
    };
  },

  _getInputOutputSchemasForDecisionNode: (
    configuration: DecisionNodeConfiguration,
  ): {
    inputSchema: NodeInputSchema;
    outputSchema: NodeOuputSchema;
  } => {
    const inputVariableSet = new Set<string>();

    configuration.rules.forEach((data) => {
      nodeSchemaService._updateNameSetForExpression(
        inputVariableSet,
        data.conditionExpression,
      );
    });

    return {
      inputSchema: {
        variableNames: [...inputVariableSet],
      },
      outputSchema: {
        variableNames: [],
      },
    };
  },

  _getInputOutputSchemasForEndNode: (
    configuration: EndNodeConfiguration,
  ): {
    inputSchema: NodeInputSchema;
    outputSchema: NodeOuputSchema;
  } => {
    const inputVariableSet = new Set<string>();

    configuration.resultMap.forEach((data) => {
      nodeSchemaService._updateNameSetForExpression(
        inputVariableSet,
        data.valueExpression,
      );
    });

    return {
      inputSchema: {
        variableNames: [...inputVariableSet],
      },
      outputSchema: {
        variableNames: [],
      },
    };
  },
};
