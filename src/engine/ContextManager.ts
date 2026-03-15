import { ContextVariableScopeType } from "../types/enums.js";
import type { JsonValue } from "../types/database.js";
import { converterUtils } from "../utils/converter.utils.js";
import type { WorkflowContext } from "./types.js";

export const contextManager = {
  create(): WorkflowContext {
    return { global: {}, next: {} };
  },

  merge(
    context: WorkflowContext,
    vars: Record<string, unknown>,
    scope: ContextVariableScopeType,
  ): WorkflowContext {
    if (scope === ContextVariableScopeType.GLOBAL) {
      return { ...context, global: { ...context.global, ...vars } };
    }
    return { ...context, next: { ...context.next, ...vars } };
  },

  resolveForNode(context: WorkflowContext): Record<string, unknown> {
    return { ...context.global, ...context.next };
  },

  clearNextScope(context: WorkflowContext): WorkflowContext {
    return { ...context, next: {} };
  },

  fromJson(json: JsonValue): WorkflowContext {
    const obj = converterUtils.jsonValueToObject(json);
    return {
      global: (obj.global as Record<string, unknown>) ?? {},
      next: (obj.next as Record<string, unknown>) ?? {},
    };
  },
};
