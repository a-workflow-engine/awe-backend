import { DataIntegrityError } from "../errors/DataIntegrity";
import type { JsonValue } from "../types/database";
import type { ContextVariables } from "../types/engine";
import type { NodeInputSchema } from "../types/workflow";
import { z } from "zod";

function isNodeInputSchema(value: unknown): value is NodeInputSchema {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return (
    Array.isArray(obj.variableNames) &&
    obj.variableNames.every((v) => typeof v === "string")
  );
}

export const converterUtils = {
  jsonValueToObject: (value: JsonValue): Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  },

  objectToJsonValue: (value: object): JsonValue => {
    return value as JsonValue;
  },

  jsonValueToContextVariables: (value: JsonValue): ContextVariables => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new DataIntegrityError("Invalid context variables");
    }

    const obj = value as Record<string, unknown>;

    if (!obj.constants || !obj.fetchables || !obj.urls) {
      throw new DataIntegrityError("Invalid context variables");
    }

    return obj as unknown as ContextVariables;
  },

  jsonValueToNodeInputSchema: (value: JsonValue): NodeInputSchema => {
    if (!isNodeInputSchema(value)) {
      throw new DataIntegrityError("Invalid node input schema");
    }
    return value;
  },

  objectToContextVariables: (
    obj: Record<string, unknown>,
  ): ContextVariables => {
    if (!obj.constants || !obj.fetchables || !obj.urls) {
      throw new DataIntegrityError("Invalid context variables");
    }

    return obj as unknown as ContextVariables;
  },

  parseOrThrow<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    errorMessage = "Invalid data",
  ): T {
    const result = schema.safeParse(data);

    if (result.success === false) {
      throw new DataIntegrityError(errorMessage, result.error);
    }

    return result.data;
  },
};
