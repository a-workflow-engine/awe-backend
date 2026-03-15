import type { Transaction } from "kysely";
import type { DB } from "../types/database.js";
import type { InstanceModel, NodeModel } from "../types/models.js";
import type { ExecutorResult, WorkflowContext } from "./types.js";
import { instanceRepository } from "../repositories/instance.repository.js";
import { taskRepository } from "../repositories/task.repository.js";
import { taskExecutionRepository } from "../repositories/taskExecution.repository.js";
import { nodeRepository } from "../repositories/node.repository.js";
import { edgeRepository } from "../repositories/edge.repository.js";
import { nodeService } from "../services/node.services.js";
import { contextManager } from "./ContextManager.js";
import { edgeResolver } from "./EdgeResolver.js";
import { StartNodeExecutor } from "./executors/StartNodeExecutor.js";
import { EndNodeExecutor } from "./executors/EndNodeExecutor.js";
import type { BaseExecutor } from "./executors/BaseExecutor.js";
import {
  ContextVariableScopeType,
  InstanceStatuses,
  NodeTypes,
  TaskStatuses,
} from "../types/enums.js";
import { converterUtils } from "../utils/converter.utils.js";
import { DataIntegrityError } from "../errors/DataIntegrity.js";
import { StateTransitionError } from "../errors/StateTransitionError.js";

const executors: Partial<Record<string, BaseExecutor>> = {
  [NodeTypes.START]: new StartNodeExecutor(),
  [NodeTypes.END]: new EndNodeExecutor(),
};

async function executeNode(
  instance: InstanceModel,
  node: NodeModel,
  context: WorkflowContext,
  tx: Transaction<DB>,
): Promise<InstanceModel> {
  const executor = executors[node.type];
  if (!executor) {
    throw new StateTransitionError(
      `No executor available for node type="${node.type}"`,
    );
  }

  const startedOn = new Date();
  const task = await taskRepository.insert(
    { instance_id: instance.id, node_id: node.id, status: TaskStatuses.IN_PROGRESS },
    tx,
  );

  let result: ExecutorResult;
  try {
    result = await executor.execute(instance, node, context, tx);
  } catch (err) {
    result = {
      status: TaskStatuses.FAILED,
      outputVariables: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }

  await taskRepository.updateById(task.id, { status: result.status }, tx);
  await taskExecutionRepository.insert(
    {
      task_id: task.id,
      status: result.status,
      started_on: startedOn,
      ended_on: new Date(),
      input_variables: converterUtils.objectToJsonValue(
        contextManager.resolveForNode(context),
      ),
      output_variables: converterUtils.objectToJsonValue(result.outputVariables),
    },
    tx,
  );

  if (result.status === TaskStatuses.FAILED) {
    return instanceRepository.updateById(
      instance.id,
      { status: InstanceStatuses.FAILED, ended_on: new Date() },
      tx,
    );
  }

  if (node.type === NodeTypes.END) {
    return instanceRepository.updateById(
      instance.id,
      {
        status: InstanceStatuses.COMPLETED,
        output_variables: converterUtils.objectToJsonValue(result.outputVariables),
        ended_on: new Date(),
      },
      tx,
    );
  }

  const clearedContext = contextManager.clearNextScope(context);
  const updatedContext = contextManager.merge(
    clearedContext,
    result.outputVariables,
    ContextVariableScopeType.GLOBAL,
  );

  const updatedInstance = await instanceRepository.updateById(
    instance.id,
    { current_variables: converterUtils.objectToJsonValue(updatedContext) },
    tx,
  );

  return advance(updatedInstance, node.id, updatedContext, tx);
}

async function advance(
  instance: InstanceModel,
  completedNodeId: string,
  context: WorkflowContext,
  tx: Transaction<DB>,
): Promise<InstanceModel> {
  const nodes = await nodeRepository.findByWorkflowVersionId(
    instance.workflow_version_id,
    tx,
  );
  const edges = await edgeRepository.findByNodeIds(
    nodes.map((n) => n.id),
    tx,
  );

  let nextNodeIds: string[];
  try {
    nextNodeIds = edgeResolver.resolveNextNodeIds(
      completedNodeId,
      context,
      edges,
      nodes,
    );
  } catch {
    return instanceRepository.updateById(
      instance.id,
      { status: InstanceStatuses.FAILED, ended_on: new Date() },
      tx,
    );
  }

  if (nextNodeIds.length === 0) {
    return instanceRepository.updateById(
      instance.id,
      { status: InstanceStatuses.FAILED, ended_on: new Date() },
      tx,
    );
  }

  let currentInstance = instance;
  for (const nextNodeId of nextNodeIds) {
    const nextNode = nodes.find((n) => n.id === nextNodeId);
    if (!nextNode) {
      throw new DataIntegrityError(
        `Node id=${nextNodeId} not found in workflow version`,
      );
    }
    currentInstance = await executeNode(currentInstance, nextNode, context, tx);
  }

  return currentInstance;
}

export const executionEngine = {
  start: async (
    instance: InstanceModel,
    tx: Transaction<DB>,
  ): Promise<InstanceModel> => {
    const startNode = await nodeService.getByStartNodeByWorkflowVersionIdOrThrow(
      instance.workflow_version_id,
      tx,
    );

    const context = contextManager.create();
    const startedOn = new Date();

    const task = await taskRepository.insert(
      {
        instance_id: instance.id,
        node_id: startNode.id,
        status: TaskStatuses.IN_PROGRESS,
      },
      tx,
    );

    let result: ExecutorResult;
    try {
      result = await executors[NodeTypes.START]!.execute(
        instance,
        startNode,
        context,
        tx,
      );
    } catch (err) {
      result = {
        status: TaskStatuses.FAILED,
        outputVariables: {},
        error: err instanceof Error ? err.message : String(err),
      };
    }

    await taskRepository.updateById(task.id, { status: result.status }, tx);
    await taskExecutionRepository.insert(
      {
        task_id: task.id,
        status: result.status,
        started_on: startedOn,
        ended_on: new Date(),
        input_variables: instance.input_variables,
        output_variables: converterUtils.objectToJsonValue(result.outputVariables),
      },
      tx,
    );

    if (result.status === TaskStatuses.FAILED) {
      return instanceRepository.updateById(
        instance.id,
        { status: InstanceStatuses.FAILED, ended_on: new Date() },
        tx,
      );
    }

    const constants = (result.outputVariables.constants ?? {}) as Record<
      string,
      unknown
    >;
    const updatedContext = contextManager.merge(
      context,
      constants,
      ContextVariableScopeType.GLOBAL,
    );

    const updatedInstance = await instanceRepository.updateById(
      instance.id,
      { current_variables: converterUtils.objectToJsonValue(updatedContext) },
      tx,
    );

    return advance(updatedInstance, startNode.id, updatedContext, tx);
  },
};
