import { z } from "zod";
import { EdgeSchema, NodeSchema } from "./node.schema.js";
import { EnvironmentTypeSchema } from "./environment.schema.js";
import { PaginationParamsSchema } from "./pagination.schema.js";
import { SortType } from "../types/enums.js";

export const WorkflowListRequestSchema = z.object({
  ...PaginationParamsSchema.shape,
  search: z.string().optional(),
  createdSort: z.enum(SortType).default(SortType.DESCENDING),
  environment: EnvironmentTypeSchema,
});

export const WorkflowCreateRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z
    .string()
    .min(1)
    .optional()
    .transform((val) => val ?? null),
});

export const WorkflowIdSchema = z.object({
  workflowId: z.uuidv4(),
});

export const WorkflowUpdateRequestSchema = z
  .object({
    workflowId: z.uuidv4(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().min(1).optional().nullable(),
  })
  .refine((data) => data.name != null || data.description != null, {
    message: "Provide at least one non-empty field to update",
  });

export const WorkflowDefinitionSchema = z.object({
  nodes: z.array(NodeSchema).default([]),
  edges: z.array(EdgeSchema).default([]),
});

export const WorkflowDefinitionValidateSchema = WorkflowDefinitionSchema;

export type ListWorkflowInput = z.infer<typeof WorkflowListRequestSchema>;

export type CreateWorkflowInput = z.infer<typeof WorkflowCreateRequestSchema>;

export type UpdateWorkflowInput = z.infer<typeof WorkflowUpdateRequestSchema>;
