import {
  taskRepository,
  type TaskDetailItem,
} from "../repositories/task.repository.js";
import { UserNodeConfigurationSchema } from "../schemas/node.schema.js";
import { contextManager } from "../engine/ContextManager.js";
import { buildFeelContext } from "../utils/contextResolver.js";
import { evaluate } from "@bpmn-io/feelin";
import type { JsonValue } from "../types/database.js";

export interface ResolvedTask {
  id: string;
  instance_id: string;
  node_id: string;
  status: string;
  created_on: string;
  workflow_name: string;
  node_configuration: {
    title?: string;
    description?: string;
    assignee?: string;
    requestMap: Array<{ label: string; value: unknown }>;
    responseMap: unknown[];
  };
}

async function resolveTask(task: TaskDetailItem): Promise<ResolvedTask> {
  const configParsed = UserNodeConfigurationSchema.safeParse(
    task.node_configuration,
  );

  if (!configParsed.success) {
    const { instance_context: _, ...rest } = task;
    return rest as unknown as ResolvedTask;
  }

  const config = configParsed.data;
  const context = contextManager.fromJson(
    task.instance_context as JsonValue,
  );
  const feelContext = await buildFeelContext(context);

  const resolvedRequestMap = config.requestMap.map((field) => {
    const result = evaluate(field.valueExpression, feelContext);
    return { label: field.label, value: result.value };
  });

  let resolvedAssignee = config.assignee;
  if (resolvedAssignee && resolvedAssignee.startsWith("context.")) {
    const result = evaluate(resolvedAssignee, feelContext);
    resolvedAssignee =
      result.value != null ? String(result.value) : resolvedAssignee;
  }

  const { instance_context: _, ...rest } = task;

  return {
    ...rest,
    node_configuration: {
      title: config.title,
      description: config.description,
      assignee: resolvedAssignee,
      requestMap: resolvedRequestMap,
      responseMap: config.responseMap,
    },
  } as unknown as ResolvedTask;
}

export const taskService = {
  listPending: async (actorId: string): Promise<ResolvedTask[]> => {
    const tasks = await taskRepository.findAllPending(actorId);
    return Promise.all(tasks.map(resolveTask));
  },

  getTask: async (
    taskId: string,
    actorId: string,
  ): Promise<ResolvedTask | undefined> => {
    const task = await taskRepository.findByIdWithContext(taskId, actorId);
    if (!task) return undefined;
    return resolveTask(task);
  },
};
