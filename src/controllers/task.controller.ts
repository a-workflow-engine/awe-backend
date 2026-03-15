import type { Request, Response } from "express";
import { taskService } from "../services/task.service.js";
import { TaskParamsSchema } from "../schemas/task.schema.js";
import { NotFoundError } from "../errors/NotFoundError.js";

export const taskController = {
  getTask: async (req: Request, res: Response) => {
    const { taskId } = TaskParamsSchema.parse(req.params);
    const task = await taskService.getTask(taskId);
    if (!task) throw new NotFoundError("Task");
    return res.json({ task });
  },
};
