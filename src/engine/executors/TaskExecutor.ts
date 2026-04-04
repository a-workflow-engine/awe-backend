import { EngineError } from "../../errors/EngineError.js";
import { taskExecutionService } from "../../services/taskExecution.service.js";
import type { NodeType } from "../../types/database.js";
import type { InputVariables, ExecutorResult } from "../../types/engine.js";
import { NodeTypes, TaskStatuses } from "../../types/enums.js";
import type { NodeModel, TaskModel } from "../../types/models.js";
import type { BaseExecutor } from "./BaseExecutor.js";
import { DecisionNodeExecutor } from "./DecisionNodeExecutor.js";
import { EndNodeExecutor } from "./EndNodeExecutor.js";
import { ScriptNodeExecutor } from "./ScriptNodeExecutor.js";
import { ServiceNodeExecutor } from "./ServiceNodeExecuter.js";
import { StartNodeExecutor } from "./StartNodeExecutor.js";

type ExecutorConstructor = new (
  node: NodeModel,
  inputVariables: InputVariables,
) => BaseExecutor<any>;

const ExecutorMap: Record<
  Exclude<NodeType, typeof NodeTypes.USER>,
  ExecutorConstructor
> = {
  [NodeTypes.START]: StartNodeExecutor,
  [NodeTypes.SERVICE]: ServiceNodeExecutor,
  [NodeTypes.SCRIPT]: ScriptNodeExecutor,
  [NodeTypes.DECISION]: DecisionNodeExecutor,
  [NodeTypes.END]: EndNodeExecutor,
};

export default class TaskExecutor {
  private executorConstructor: ExecutorConstructor;
  private node: NodeModel;
  private task: TaskModel;

  constructor(task: TaskModel, node: NodeModel) {
    this.task = task;
    this.node = node;

    if (node.type == NodeTypes.USER) {
      throw new EngineError(
        `User task cannot be executed by engine - Task id=${task.id}`,
      );
    }

    const Executor = ExecutorMap[node.type];
    if (!Executor) {
      throw new EngineError(`Executor for ${node.type} not found`);
    }

    this.executorConstructor = Executor;
  }

  async run(
    context: InputVariables,
  ): Promise<{ executionId: string; result: ExecutorResult }> {
    const taskExecution = await taskExecutionService.create(
      this.task.instance_id,
      this.task.id,
      context,
    );

    const executor = new this.executorConstructor(this.node, context);

    executor;
    const result = await executor.run().catch((err: Error) => {
      return {
        status: TaskStatuses.FAILED,
        outputVariables: {},
        nextNodeId: null,
        errorMessage: err.message,
        error: err,
      };
    });

    return {
      executionId: taskExecution.id,
      result,
    };
  }

  async end(executionId: string, result: ExecutorResult) {
    if (result.status === TaskStatuses.COMPLETED) {
      await taskExecutionService.complete(
        this.task.instance_id,
        executionId,
        result.outputVariables,
      );
      return;
    }

    await taskExecutionService.fail(this.task.instance_id, executionId, {
      message: result.errorMessage ?? "Unkown error",
      error: result.error,
    });
  }
}
