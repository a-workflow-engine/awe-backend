import { z } from "zod";
import { VersionIncrementType } from "../types/enums.js";
import { PaginationParamsSchema } from "./pagination.schema.js";
import { WorkflowDefinitionSchema } from "./workflow.schema.js";

export const DraftListRequestSchema = z.object({
  ...PaginationParamsSchema.shape,
  workflowId: z.uuidv4().optional(),
});

export const DraftCreateRequestSchema = z.object({
  workflowId: z.uuidv4(),
  description: z.string().nullable().optional(),
  definition: WorkflowDefinitionSchema.default({ nodes: [], edges: [] }),
});

export const DraftIdSchema = z.object({
  draftId: z.uuidv4(),
});

export const DraftDetailRequestSchema = z.object({
  ...DraftIdSchema.shape,
  include: z.enum(["definition"]).optional(),
});

export const DraftUpdateRequestSchema = z.object({
  ...DraftIdSchema.shape,
  description: z.string().nullable().optional(),
  definition: WorkflowDefinitionSchema.optional(),
});

export const DraftPublishRequestSchema = z.object({
  ...DraftIdSchema.shape,
  incrementType: z
    .enum(VersionIncrementType)
    .default(VersionIncrementType.MAJOR),
});

export type ListDraftInput = z.infer<typeof DraftListRequestSchema>;

export type CreateDraftInput = z.infer<typeof DraftCreateRequestSchema>;

export type DetailDraftInput = z.infer<typeof DraftDetailRequestSchema>;

export type UpdateDraftInput = z.infer<typeof DraftUpdateRequestSchema>;

export type PublishDraftInput = z.infer<typeof DraftPublishRequestSchema>;
