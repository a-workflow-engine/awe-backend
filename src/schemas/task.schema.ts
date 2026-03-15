import { z } from "zod";

export const TaskParamsSchema = z.object({
  taskId: z.uuid(),
});
