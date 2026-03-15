import type { Transaction } from "kysely";
import type { DB } from "../../types/database.js";
import type { InstanceModel, NodeModel } from "../../types/models.js";
import type { WorkflowContext, ExecutorResult } from "../types.js";

export abstract class BaseExecutor {
  abstract execute(
    instance: InstanceModel,
    node: NodeModel,
    context: WorkflowContext,
    transaction: Transaction<DB>,
  ): Promise<ExecutorResult>;
}
