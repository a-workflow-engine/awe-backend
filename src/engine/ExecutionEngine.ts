import { db } from "../database.js";
import { StartNodeExecutor } from "./executors/StartNodeExecutor.js";
import { EndNodeExecutor } from "./executors/EndNodeExecutor.js";
import { DecisionNodeExecutor } from "./executors/DecisionNodeExecutor.js";
import { ServiceNodeExecutor } from "./executors/ServiceNodeExecuter.js";
import type { BaseExecutor } from "./executors/BaseExecutor.js";
import { InstanceStatuses, NodeTypes, TaskStatuses } from "../types/enums.js";
import { converterUtils } from "../utils/converter.utils.js";
import { ScriptNodeExecutor } from "./executors/ScriptNodeExecutor.js";
import { taskService } from "../services/task.service.js";
import { instanceService } from "../services/instance.service.js";
import type { DB, InstanceStatus, NodeType } from "../types/database.js";
import type {
  InstanceModel,
  NodeModel,
  TaskExecutionModel,
  TaskModel,
} from "../types/models.js";
import type { ContextVariables, ExecutorResult } from "../types/engine.js";
import { nodeService } from "../services/node.services.js";
import { EngineError } from "../errors/EngineError.js";
import { StateTransitionError } from "../errors/StateTransitionError.js";
import type { Transaction } from "kysely";
import { AppError } from "../errors/AppError.js";
import { taskExecutionService } from "../services/taskExecution.service.js";

const executors: Partial<Record<string, BaseExecutor>> = {
  [NodeTypes.START]: new StartNodeExecutor(),
  [NodeTypes.END]: new EndNodeExecutor(),
  [NodeTypes.DECISION]: new DecisionNodeExecutor(),
  [NodeTypes.SCRIPT]: new ScriptNodeExecutor(),
  [NodeTypes.SERVICE]: new ServiceNodeExecutor(),
};

function getUpdatedInstanceContext(
  node: NodeModel,
  executionOuputVariables: Record<string, unknown>,
  instance: InstanceModel,
): ContextVariables {
  if (node.type === NodeTypes.START) {
    return converterUtils.objectToContextVariables(executionOuputVariables);
  }
  const instanceContext = converterUtils.jsonValueToContextVariables(
    instance.current_variables,
  );

  return {
    constants: {
      ...instanceContext.constants,
      ...executionOuputVariables,
    },
    fetchables: {},
    urls: {},
  };
}

function getUpdatedInstanceStatus(
  isAutoAdvance: boolean,
  result: ExecutorResult,
  nodeType: NodeType,
) {
  let instanceStatus: InstanceStatus;

  if (
    result.status === TaskStatuses.IN_PROGRESS &&
    nodeType === NodeTypes.USER
  ) {
    instanceStatus = InstanceStatuses.PAUSED;
  } else if (result.status === TaskStatuses.TERMINATED) {
    instanceStatus = InstanceStatuses.TERMINATED;
  } else if (nodeType === NodeTypes.END) {
    instanceStatus = InstanceStatuses.COMPLETED;
  } else if (
    result.nextNodeId === null ||
    result.status === TaskStatuses.FAILED
  ) {
    instanceStatus = InstanceStatuses.FAILED;
  } else {
    instanceStatus = isAutoAdvance
      ? InstanceStatuses.IN_PROGRESS
      : InstanceStatuses.PAUSED;
  }

  return instanceStatus;
}

async function getNextNode(nextNodeId: string, currentNodeType: NodeType) {
  if (currentNodeType === NodeTypes.END) {
    return null;
  }

  const nextNode = await nodeService.getById(nextNodeId);
  if (!nextNode) {
    throw new EngineError(`Node not found node id = ${nextNodeId}`);
  }

  return nextNode;
}

async function getExecutionDetails(
  instance: InstanceModel,
  node: NodeModel,
  task: TaskModel,
) {
  try {
    const executor = executors[node.type];
    if (!executor) {
      throw new EngineError(`Executor for ${node.type} not implemented`);
    }

    executionEngine.validateInstanceCanExecuteOrThrow(instance);

    const executionContext = taskService.getTaskContext(instance, node);

    const taskExecution = await taskService.start(task, executionContext);

    return { executor, executionContext, taskExecution };
  } catch (err) {
    console.error(err);
    let message = "Unknown error";

    if (err instanceof Error) {
      message = err.message;
    }

    await Promise.all([
      taskService.fail(task.id, "Failed to initialize task execution.", {
        err,
      }),
      instanceService.fail(
        instance.id,
        `Failed at node id = ${node.client_id}`,
        {},
      ),
    ]);

    throw err;
  }
}

async function resolveInstanceUpdate(
  instance: InstanceModel,
  node: NodeModel,
  result: ExecutorResult,
): Promise<{
  nextNode: NodeModel | null;
  instanceStatus: InstanceStatus;
  instanceContext: ContextVariables;
}> {
  const nextNode = result.nextNodeId
    ? await getNextNode(result.nextNodeId, node.type)
    : null;

  const instanceStatus = getUpdatedInstanceStatus(
    instance.auto_advance,
    result,
    node.type,
  );

  const instanceContext = getUpdatedInstanceContext(
    node,
    result.outputVariables,
    instance,
  );

  return { nextNode, instanceStatus, instanceContext };
}

async function applyInstanceUpdate(
  instance: InstanceModel,
  node: NodeModel,
  result: ExecutorResult,
  nextNode: NodeModel | null,
  instanceStatus: InstanceStatus,
  instanceContext: ContextVariables,
  transaction: Transaction<DB>,
): Promise<InstanceModel> {
  if (node.type === NodeTypes.END && result.status === TaskStatuses.COMPLETED) {
    return await instanceService.end(
      instance.id,
      instanceStatus,
      result.outputVariables,
      transaction,
    );
  }

  if (instanceStatus === InstanceStatuses.FAILED || nextNode === null) {
    return await instanceService.fail(
      instance.id,
      result.error ?? "",
      {},
      transaction,
    );
  }

  return await instanceService.updateContext(
    instance.id,
    instanceStatus,
    instanceContext,
    nextNode.id,
    transaction,
  );
}

async function runExecution(
  executor: BaseExecutor,
  executionContext: ContextVariables,
  node: NodeModel,
  instance: InstanceModel,
  taskExecution: TaskExecutionModel,
) {
  const result = await executor.execute(node, executionContext);
  const { nextNode, instanceStatus, instanceContext } =
    await resolveInstanceUpdate(instance, node, result);

  await db.transaction().execute(async (transaction) => {
    const [, updatedInstance] = await Promise.all([
      taskService.end(
        taskExecution,
        result.status,
        result.outputVariables,
        transaction,
      ),
      applyInstanceUpdate(
        instance,
        node,
        result,
        nextNode,
        instanceStatus,
        instanceContext,
        transaction,
      ),
    ]);

    if (nextNode && instance.auto_advance) {
      await taskService.create(nextNode, updatedInstance, transaction);
    }
  });
}

async function handleExecutionFailure(
  task: TaskModel,
  taskExecution: TaskExecutionModel,
  instance: InstanceModel,
  err: unknown,
) {
  const message = err instanceof Error ? err.message : "Unknown error";
  await db.transaction().execute(async (transaction) => {
    await Promise.all([
      taskExecutionService.fail(taskExecution.id, transaction),
      taskService.fail(task.id, message, { err }, transaction),
      instanceService.fail(instance.id, message, { err }, transaction),
    ]);
  });
}

export const executionEngine = {
  validateInstanceCanExecuteOrThrow: (instance: InstanceModel) => {
    if (
      instance.status === InstanceStatuses.FAILED ||
      instance.status === InstanceStatuses.TERMINATED ||
      instance.status === InstanceStatuses.COMPLETED
    ) {
      throw new StateTransitionError(
        `Instance has already ${instance.status}. Cannot execute next node.`,
      );
    }

    if (
      !instance.auto_advance &&
      instance.status === InstanceStatuses.IN_PROGRESS
    ) {
      throw new StateTransitionError("Instance is in execution");
    }

    if (instance.auto_advance && instance.status === InstanceStatuses.PAUSED) {
      throw new StateTransitionError(`Instance is ${InstanceStatuses.PAUSED}`);
    }
  },

  executeTask: async (taskId: string) => {
    const { instance, node, task } =
      await taskService.getAllTaskDetails(taskId);

    console.log("Executing:", node.type);

    const { executor, executionContext, taskExecution } =
      await getExecutionDetails(instance, node, task);

    await runExecution(
      executor,
      executionContext,
      node,
      instance,
      taskExecution,
    ).catch((err) =>
      handleExecutionFailure(task, taskExecution, instance, err),
    );
  },
};
