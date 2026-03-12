import type { UserTask } from "../types/workflow.type.js";

const taskStore: Map<string, UserTask> = new Map();

export const taskService = {
  async createTask(task: UserTask) {
    taskStore.set(task.taskId, task);
    return task;
  },

  async getTask(taskId: string) {
    return taskStore.get(taskId);
  },

  async completeTask(taskId: string) {
    const task = taskStore.get(taskId);
    if (!task) throw new Error("Task not found");

    task.status = "COMPLETED";
    taskStore.set(taskId, task);

    return task;
  },
};