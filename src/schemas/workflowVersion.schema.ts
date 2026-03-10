import { z } from "zod";
import { ActorSchema } from "./actor.schema.js";
import { WorkflowVersionStatuses } from "../types/enums.js";

export const WorkflowVersionDetailRequest = z.object({
  workflowId: z.uuidv4(),
  version: z.coerce.number().min(1),
  actor: ActorSchema,
});

export const WorkflowVersionUpdateStatusRequest = z.object({
  workflowId: z.uuidv4(),
  version: z.coerce.number().min(1),
  actor: ActorSchema,
  status: z.enum([
    WorkflowVersionStatuses.PUBLISHED,
    WorkflowVersionStatuses.ACTIVE,
  ]),
});

export const WorkflowVersionValidateRequest = z.object({
  workflowId: z.uuidv4(),
  version: z.coerce.number().min(1),
  actor: ActorSchema,
});
