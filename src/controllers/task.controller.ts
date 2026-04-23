import type { Request, Response } from "express";
import { taskService } from "../services/task.service.js";
import { z } from "zod";

const TaskParamsSchema = z.object({
  taskId: z.uuidv4(),
});

export const taskController = {
  get: async (req: Request, res: Response) => {
    const { taskId } = TaskParamsSchema.parse({ ...req.params });

    const detail = await taskService.getDetail(
      taskId,
      req.context.environments,
    );
    return res.json(detail);
  },

  retry: async (req: Request, res: Response) => {
    const { taskId } = TaskParamsSchema.parse(req.params);

    const task = await taskService.retry(taskId, req.context.actor.id);

    return res.json(task);
  },
};
