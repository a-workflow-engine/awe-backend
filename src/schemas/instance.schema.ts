import { z } from "zod";

export const InstanceCreateSchema = z.object({
  workflowId: z.uuidv4(),
  context: z.object().optional().default({}),
  autoAdvance: z.boolean().optional().default(true),
});
