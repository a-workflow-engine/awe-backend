import { z } from "zod";
import { ActorSchema } from "./actor.schema.js";
import { NodeSchema, EdgeSchema } from "./node.schema.js";
import { WorkflowVersionStatuses } from "../types/enums.js";

export const VersionIdSchema = z.object({
  versionId: z.string().uuid(),
  actor: ActorSchema,
});

export const VersionUpdateStatusSchema = z.object({
  versionId: z.string().uuid(),
  actor: ActorSchema,
  status: z.enum([
    WorkflowVersionStatuses.PUBLISHED,
    WorkflowVersionStatuses.ACTIVE,
  ]),
});

export const VersionValidateSchema = z.object({
  versionId: z.string().uuid(),
  actor: ActorSchema,
});

export const VersionUpdateSchema = z.object({
  versionId: z.string().uuid(),
  actor: ActorSchema,
  description: z.string().nullable().optional(),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});