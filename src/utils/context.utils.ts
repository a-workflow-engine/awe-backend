import type { InputVariables, Context } from "../types/engine.js";
import { DataIntegrityError } from "../errors/DataIntegrity.js";
import { evaluate } from "@bpmn-io/feelin";
import type { NodeInputSchema } from "../types/workflow.js";
import { EngineError } from "../errors/EngineError.js";
import { httpRequestService } from "../services/httpRequest.service.js";
import { JSONPath } from "jsonpath-plus";
import type { FeelDataType } from "../types/enums.js";
import { isValidFeelType, type FeelDataTypeMap } from "./feel.utils.js";

export const contextUtils = {
  getByJsonPath(data: any, path: string): unknown {
    try {
      const result = JSONPath({
        path,
        json: data,
        wrap: false,
      });

      return result;
    } catch {
      return undefined;
    }
  },

  async evaluateContext(contextVariables: InputVariables): Promise<Context> {
    const { constants, fetchables, urls } = contextVariables;

    const returnContext: Record<string, unknown> = { ...constants };

    const fetchedResponses: Record<string, unknown> = {};

    for (const [varName, { urlId, jsonPath, dataType }] of Object.entries(
      fetchables,
    )) {
      const urlSettings = urls[urlId];
      if (!urlSettings) {
        throw new DataIntegrityError(
          `Context does not have referenced url of id=${urlId} `,
        );
      }

      if (!(urlId in fetchedResponses)) {
        const result = evaluate(urlSettings.urlExpression, {
          context: returnContext,
        });

        if (result.warnings.length !== 0 || typeof result.value !== "string") {
          throw new DataIntegrityError(
            `Invalid FEEL expression "${urlSettings.urlExpression}"`,
          );
        }

        const headers: Record<string, string> = {};

        for (const [key, value] of Object.entries(urlSettings.headers)) {
          const result = evaluate(value, {
            context: returnContext,
          });
          if (
            result.warnings.length !== 0 ||
            typeof result.value !== "string"
          ) {
            throw new DataIntegrityError(`Invalid FEEL expression "${value}"`);
          }

          headers[key] = result.value;
        }

        fetchedResponses[urlId] = await httpRequestService.get(
          result.value,
          urlSettings.headers,
        );
      }

      const rawValue = contextUtils.getByJsonPath(
        fetchedResponses[urlId],
        jsonPath,
      );
      returnContext[varName] = rawValue;
    }

    return { context: returnContext };
  },

  getFeelEvaluatedValue<T extends FeelDataType>(
    expression: string,
    context: Context,
    dataType?: T,
  ): FeelDataTypeMap[T] {
    const result = evaluate(expression, context);

    if (!result || result.warnings.length > 0) {
      throw new DataIntegrityError(`Invalid FEEL expression ${expression}`);
    }

    if (dataType && !isValidFeelType(result.value, dataType)) {
      throw new DataIntegrityError(
        `Invalid FEEL expression ${expression}, expected ${dataType}, got ${typeof result.value}`,
      );
    }

    return result.value as FeelDataTypeMap[T];
  },

  getTaskContext(
    instanceContext: InputVariables,
    inputSchema: NodeInputSchema,
  ): InputVariables {
    const { constants, fetchables, urls } = instanceContext;
    const taskContext: InputVariables = {
      constants: {},
      fetchables: {},
      urls: {},
    };

    inputSchema.variableNames.forEach((variableName) => {
      if (variableName in constants) {
        taskContext.constants[variableName] = constants[variableName];
        return;
      }

      const fetchable = fetchables[variableName];

      if (fetchable === undefined) {
        throw new EngineError(
          `Required variable ${variableName} does not exists in context`,
        );
      }

      taskContext.fetchables[variableName] = fetchable;

      const urlSettings = urls[fetchable.urlId];
      if (!urlSettings) {
        throw new DataIntegrityError(
          `Context does not have referenced url of id=${fetchable.urlId} `,
        );
      }

      taskContext.urls[fetchable.urlId] = urlSettings;
    });

    return taskContext;
  },
};
