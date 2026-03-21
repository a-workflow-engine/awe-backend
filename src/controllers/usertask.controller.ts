import type { Request, Response } from "express";
import { userTaskService } from "../services/userTask.service.js";
import {
  TaskParamsSchema,
  TaskCompleteSchema,
} from "../schemas/task.schema.js";

export const userTaskController = {
  list: async (req: Request, res: Response) => {
    const pendingTasks = await userTaskService.getPending(req.actor);
    return res.json({ tasks: pendingTasks });
  },

  getTask: async (req: Request, res: Response) => {
    const { taskId } = TaskParamsSchema.parse(req.params);
    const task = await userTaskService.get(taskId, req.actor);
    return res.json({ ...task });
  },

  completeUserTask: async (req: Request, res: Response) => {
    const { taskId } = TaskParamsSchema.parse(req.params);
    const { userInput } = TaskCompleteSchema.parse(req.body);
    const execution = await userTaskService.completeUserTask(taskId, userInput, req.actor);
    return res.json({
      status: execution.status,
      completedAt: execution.ended_on
    });
  },
};
