import type { TaskModel } from "../types/models.js";
import { taskRepository } from "../repositories/task.repository.js";

export const taskService = {
  getTask: async (taskId: string): Promise<TaskModel | undefined> => {
    return taskRepository.findById(taskId);
  },
};
