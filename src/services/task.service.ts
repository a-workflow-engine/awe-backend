import { taskRepository } from "../repositories/task.repository.js";
import type { DB, TaskStatus } from "../types/database.js";
import type { InstanceModel, NodeModel, TaskModel } from "../types/models.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import type { Transaction } from "kysely";

export const taskService = {
  getAllTaskDetails: async (
    taskId: string,
  ): Promise<{ instance: InstanceModel; node: NodeModel; task: TaskModel }> => {
    const task = await taskService.findById(taskId);
    if (!task) {
      throw new NotFoundError("task");
    }

    const [instance, node] = await Promise.all([
      instanceService.findById(task.instance_id),
      nodeService.getById(task.node_id),
    ]);

    if (!instance) {
      throw new NotFoundError("instance");
    }
    if (!node) {
      throw new NotFoundError("node");
    }

    return { instance, node, task };
  },

  createNew: async (
    instanceId: string,
    nodeId: string,
    status: TaskStatus,
    transaction?: Transaction<DB>,
  ): Promise<TaskModel> => {
    return taskRepository.insert(
      {
        instance_id: instanceId,
        node_id: nodeId,
        status,
      },
      transaction,
    );
  },

  updateStatus: async (
    taskId: string,
    status: TaskStatus,
    transaction?: Transaction<DB>,
  ): Promise<TaskModel> => {
    return taskRepository.updateById(
      taskId,
      {
        status,
      },
      transaction,
    );
  },
};
