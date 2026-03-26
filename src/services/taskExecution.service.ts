import { Transaction } from "kysely";
import { taskExecutionRepository } from "../repositories/taskExecution.repository";
import type { DB, TaskStatus } from "../types/database";
import { converterUtils } from "../utils/converter.utils";
import type { TaskExecutionModel } from "../types/models";
import { transitionLogService } from "./transitionLog.service";
import { TaskStatuses, TaskTransitionTypes } from "../types/enums";
import { db } from "../database";

export const taskExecutionService = {
  createAndStart: async (
    taskId: string,
    status: TaskStatus,
    inputVariables: object,
  ): Promise<TaskExecutionModel> => {
    return await db.transaction().execute(async (transaction) => {
      const taskExecution = taskExecutionRepository.insert(
        {
          task_id: taskId,
          status,
          input_variables: converterUtils.objectToJsonValue(inputVariables),
          started_on: new Date(),
        },
        transaction,
      );

      await transitionLogService.createTaskLog(
        { taskId: taskId, type: TaskTransitionTypes.STARTED },
        transaction,
      );

      return taskExecution;
    });
  },

  fail: async (
    taskExecutionId: string,
    transaction?: Transaction<DB>,
  ): Promise<TaskExecutionModel> => {
    return taskExecutionRepository.updateById(
      taskExecutionId,
      {
        status: TaskStatuses.FAILED,
        ended_on: new Date(),
      },
      transaction,
    );
  },

  updateStatus: async (
    taskId: string,
    status: TaskStatus,
    transaction?: Transaction<DB>,
  ): Promise<TaskExecutionModel> => {
    return taskExecutionRepository.updateById(
      taskId,
      {
        status,
      },
      transaction,
    );
  },
};
