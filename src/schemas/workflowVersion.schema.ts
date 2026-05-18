import { z } from "zod";
import { EnvironmentTypes } from "../types/enums.js";
import { PaginationParamsSchema } from "./pagination.schema.js";
import { EnvironmentTypeSchema } from "./environment.schema.js";

export const VersionListRequestSchema = z.object({
  ...PaginationParamsSchema.shape,
  workflowId: z.uuidv4().optional(),
  environment: EnvironmentTypeSchema.default(EnvironmentTypes.DEVELOPMENT),
});

export const VersionDetailRequestSchema = z.object({
  versionId: z.uuidv4(),
  environment: EnvironmentTypeSchema.default(EnvironmentTypes.DEVELOPMENT),
  include: z.enum(["definition"]).optional(),
});

export const WorkflowVersionIdSchema = z.object({
  versionId: z.uuidv4(),
});

export const WorkflowVersionToggleRequestSchema = z.object({
  versionId: z.uuidv4(),
  environment: EnvironmentTypeSchema.default(EnvironmentTypes.DEVELOPMENT),
});

export type ListVersionsInput = z.infer<typeof VersionListRequestSchema>;

export type DetailVersionInput = z.infer<typeof VersionDetailRequestSchema>;

export type ToggleVersionInput = z.infer<
  typeof WorkflowVersionToggleRequestSchema
>;
