import { db } from "../database.js";
import type { DB, Task, TaskStatus } from "../types/database.js";
import type { Insertable, Updateable, Transaction } from "kysely";
import { RepositoryError } from "../errors/RepositoryError.js";
import type {
  NodeModel,
  TaskExecutionModel,
  TaskModel,
} from "../types/models.js";
import { TaskStatuses } from "../types/enums.js";

type NewTask = Insertable<Task>;
type UpdateTask = Updateable<Task>;

export const taskRepository = {
  findById: async (
    id: string,
    transaction?: Transaction<DB>,
  ): Promise<TaskModel | undefined> => {
    try {
      return await (transaction ?? db)
        .selectFrom("task")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    } catch (err) {
      throw new RepositoryError(`Find task by id=${id} failed`, err);
    }
  },

  findByStatusAndInstanceId: async (
    instanceId: string,
    status: TaskStatus,
    transaction?: Transaction<DB>,
  ): Promise<TaskModel | undefined> => {
    return await (transaction ?? db)
      .selectFrom("task")
      .selectAll()
      .where("instance_id", "=", instanceId)
      .where("status", "=", status)
      .executeTakeFirst();
  },

  findInProgressByInstanceIdWithRelations: async (
    instanceId: string,
  ): Promise<
    | {
        task: TaskModel;
        taskExecution: TaskExecutionModel;
        node: NodeModel;
      }
    | undefined
  > => {
    const result = await db
      .selectFrom("task")
      .innerJoin("task_execution", "task_execution.task_id", "task.id")
      .innerJoin("node", "node.id", "task.node_id")
      .where("task.status", "=", TaskStatuses.IN_PROGRESS)
      .where("task_execution.status", "=", TaskStatuses.IN_PROGRESS)
      .where("task.instance_id", "=", instanceId)
      .select((eb) => [
        eb.ref("task.id").as("task_id"),
        eb.ref("task.instance_id").as("task_instance_id"),
        eb.ref("task.node_id").as("task_node_id"),
        eb.ref("task.status").as("task_status"),
        eb.ref("task.created_on").as("task_created_on"),

        eb.ref("task_execution.id").as("task_execution_id"),
        eb.ref("task_execution.task_id").as("task_execution_task_id"),
        eb.ref("task_execution.started_on").as("task_execution_started_on"),
        eb.ref("task_execution.ended_on").as("task_execution_ended_on"),
        eb.ref("task_execution.status").as("task_execution_status"),
        eb
          .ref("task_execution.input_variables")
          .as("task_execution_input_variables"),
        eb
          .ref("task_execution.output_variables")
          .as("task_execution_output_variables"),
        eb.ref("task_execution.created_on").as("task_execution_created_on"),

        eb.ref("node.id").as("node_id"),
        eb.ref("node.client_id").as("node_client_id"),
        eb.ref("node.configuration").as("node_configuration"),
        eb.ref("node.created_by").as("node_created_by"),
        eb.ref("node.created_on").as("node_created_on"),
        eb.ref("node.deleted_by").as("node_deleted_by"),
        eb.ref("node.deleted_on").as("node_deleted_on"),
        eb.ref("node.description").as("node_description"),
        eb.ref("node.input_schema").as("node_input_schema"),
        eb.ref("node.is_deleted").as("node_is_deleted"),
        eb.ref("node.max_attempts").as("node_max_attempts"),
        eb.ref("node.modified_by").as("node_modified_by"),
        eb.ref("node.modified_on").as("node_modified_on"),
        eb.ref("node.name").as("node_name"),
        eb.ref("node.output_schema").as("node_output_schema"),
        eb.ref("node.type").as("node_type"),
        eb.ref("node.workflow_version_id").as("node_workflow_version_id"),
        eb.ref("node.x_coordinate").as("node_x_coordinate"),
        eb.ref("node.y_coordinate").as("node_y_coordinate"),
      ])
      .executeTakeFirst();

    if (!result) {
      return result;
    }

    return {
      task: {
        id: result.task_id,
        instance_id: result.task_instance_id,
        node_id: result.task_node_id,
        status: result.task_status,
        created_on: result.task_created_on,
      },

      taskExecution: {
        id: result.task_execution_id,
        task_id: result.task_execution_task_id,
        started_on: result.task_execution_started_on,
        ended_on: result.task_execution_ended_on,
        status: result.task_execution_status,
        input_variables: result.task_execution_input_variables,
        output_variables: result.task_execution_output_variables,
        created_on: result.task_execution_created_on,
      },

      node: {
        id: result.node_id,
        client_id: result.node_client_id,
        configuration: result.node_configuration,
        created_by: result.node_created_by,
        created_on: result.node_created_on,
        deleted_by: result.node_deleted_by,
        deleted_on: result.node_deleted_on,
        description: result.node_description,
        input_schema: result.node_input_schema,
        is_deleted: result.node_is_deleted,
        max_attempts: result.node_max_attempts,
        modified_by: result.node_modified_by,
        modified_on: result.node_modified_on,
        name: result.node_name,
        output_schema: result.node_output_schema,
        type: result.node_type,
        workflow_version_id: result.node_workflow_version_id,
        x_coordinate: result.node_x_coordinate,
        y_coordinate: result.node_y_coordinate,
      },
    };
  },

  findLatestByInstanceId: async (instanceId: string) => {
    return await db
      .selectFrom("task")
      .selectAll()
      .where("instance_id", "=", instanceId)
      .orderBy("created_on", "desc")
      .limit(1)
      .executeTakeFirst();
  },

  insert: async (
    data: NewTask,
    transaction?: Transaction<DB>,
  ): Promise<TaskModel> => {
    try {
      return await (transaction ?? db)
        .insertInto("task")
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (err) {
      throw new RepositoryError("Task insert failed", err);
    }
  },

  updateById: async (
    id: string,
    data: UpdateTask,
    transaction?: Transaction<DB>,
  ): Promise<TaskModel> => {
    try {
      return await (transaction ?? db)
        .updateTable("task")
        .set(data)
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (err) {
      throw new RepositoryError("Task update failed", err);
    }
  },
};
