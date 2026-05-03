import { z } from "zod";
import { EdgeSchema, NodeSchema } from "./node.schema.js";
import {
  EnvironmentQuerySchema,
  EnvironmentTypeSchema,
} from "./environment.schema.js";
import { PaginationParamsSchema } from "./pagination.schema.js";
import { CreatedSort } from "../types/enums.js";

export const WorkflowDefinitionValidateSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

export const WorkflowCreateRequestSchema = z.object({
  name: z.string().max(255),
  description: z
    .string()
    .optional()
    .transform((val) => val ?? null),
  environment: EnvironmentTypeSchema,
});

export const WorkflowUpdateRequestSchema = z.object({
  workflowId: z.uuidv4(),
  name: z.string().max(255).optional(),
  description: z.string().optional().nullable(),
});

export const WorkflowIdSchema = z.object({
  workflowId: z.uuidv4(),
});

export const WorkflowListRequestSchema = z.object({
  ...PaginationParamsSchema.shape,
  search: z.string().optional(),
  createdSort: z.enum(CreatedSort).default(CreatedSort.DESCENDING),
  environmentTypes: EnvironmentQuerySchema.default([]),
});

export type ListWorkflowInput = z.infer<typeof WorkflowListRequestSchema>;

export type CreateWorkflowInput = z.infer<typeof WorkflowCreateRequestSchema>;

export type UpdateWorkflowInput = z.infer<typeof WorkflowUpdateRequestSchema>;
