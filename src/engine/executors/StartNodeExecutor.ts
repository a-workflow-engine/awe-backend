import type { Transaction } from "kysely";
import type { DB } from "../../types/database.js";
import type { InstanceModel, NodeModel } from "../../types/models.js";
import type { WorkflowContext, ExecutorResult } from "../types.js";
import { BaseExecutor } from "./BaseExecutor.js";
import { StartNodeConfigurationSchema } from "../../schemas/node.schema.js";
import { evaluate } from "@bpmn-io/feelin";
import { DataIntegrityError } from "../../errors/DataIntegrity.js";
import { TaskStatuses } from "../../types/enums.js";
import { converterUtils } from "../../utils/converter.utils.js";
import type { FetchableUrlConfig } from "../../utils/contextResolver.js";

/**
 * Converts a plain or template URL into a FEEL expression.
 *
 * The frontend serializes service-node URLs through `templateUrlToFeel()` which
 * wraps them in FEEL string quotes, but start-node fetchable URLs are stored
 * as-is.  This function applies the same conversion on the backend so that
 * plain URLs don't crash the FEEL parser.
 *
 * - Plain URL:     `https://example.com/api`           → `"https://example.com/api"`
 * - Template URL:  `https://example.com/{context.id}`   → `"https://example.com/" + string(context.id)`
 * - Already FEEL:  `"https://example.com/api"`          → returned as-is
 * - Other expr:    `42`, `context.url`                  → returned as-is (let FEEL evaluate)
 */
function ensureFeelExpression(expr: string): string {
  if (!expr) return '""';
  if (expr.startsWith('"')) return expr;
  if (!/^https?:\/\//i.test(expr)) return expr;
  if (!expr.includes("{")) return `"${expr}"`;

  const parts: string[] = [];
  let lastIndex = 0;
  const regex = /\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(expr)) !== null) {
    const staticPart = expr.slice(lastIndex, match.index);
    if (staticPart) parts.push(`"${staticPart}"`);
    parts.push(`string(${match[1]})`);
    lastIndex = regex.lastIndex;
  }
  const trailing = expr.slice(lastIndex);
  if (trailing) parts.push(`"${trailing}"`);
  return parts.join(" + ");
}

export class StartNodeExecutor extends BaseExecutor {
  async execute(
    instance: InstanceModel,
    node: NodeModel,
    _context: WorkflowContext,
    _transaction: Transaction<DB>,
  ): Promise<ExecutorResult> {
    const parsed = StartNodeConfigurationSchema.safeParse(node.configuration);
    if (!parsed.data) {
      throw new DataIntegrityError(
        `Start node configuration is invalid node id=${node.id}`,
      );
    }

    const configuration = parsed.data;
    const instanceInputVariables = converterUtils.jsonValueToObject(
      instance.input_variables,
    );

    const constants: Record<string, unknown> = {};

    const fetchables: Record<
      string,
      { urlId: string; jsonPath: string; dataType: string }
    > = {};

    configuration.inputDataMap.forEach((dataMap) => {
      if (dataMap.fetchableId) {
        fetchables[dataMap.contextVariableName] = {
          urlId: dataMap.fetchableId,
          jsonPath: dataMap.jsonPath,
          dataType: dataMap.dataType,
        };
      } else {
        constants[dataMap.contextVariableName] =
          instanceInputVariables[dataMap.jsonPath];
      }
    });

    const urls: Record<string, FetchableUrlConfig> = {};

    for (const f of configuration.fetchables) {
      const urlExpression = ensureFeelExpression(f.urlExpression);
      const urlResult = evaluate(urlExpression, { context: constants });
      if (
        urlResult.warnings.length > 0 ||
        typeof urlResult.value !== "string"
      ) {
        throw new DataIntegrityError(
          `Invalid FEEL URL expression in start node fetchables nodeId=${node.id}`,
        );
      }

      const headers: Record<string, string> = {};
      for (const h of f.headers ?? []) {
        const headerVal = evaluate(ensureFeelExpression(h.valueExpression), {
          context: constants,
        });
        if (typeof headerVal.value === "string") {
          headers[h.key] = headerVal.value;
        }
      }

      urls[f.id] = { url: urlResult.value, headers };
    }

    return {
      status: TaskStatuses.COMPLETED,
      outputVariables: { constants, fetchables, urls },
    };
  }
}
