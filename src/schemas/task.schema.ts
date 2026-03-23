import { z } from "zod";

export const UserTaskParamsSchema = z.object({
  taskId: z.uuidv4(),
});
