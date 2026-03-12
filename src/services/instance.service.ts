import { v4 as uuidv4 } from "uuid";
import { executionEngine } from "../Engine/ExecutionEngine.js";
import type { WorkflowContext } from "../types/workflow.type.js";
import { db } from "../database.js"; // your actual Kysely DB connection
import { instanceRepository } from "../repositories/instance.repository.js";
import type { ActorModel } from "../types/models.js";

export const instanceService = {
  async startInstance(
    workflowId: string,
    context: Record<string, any>,
    autoAdvance: boolean,
    actor: ActorModel
  ) {

    let executionResult = null;

    if (autoAdvance) {
      executionResult = await executionEngine.executeNext(context, "node_3");
    }

    const instanceStatus =
      executionResult?.executionStatus === "WAITING_FOR_USER_INPUT"
        ? "paused"
        : "in_progress";

    // Insert instance into database
    await instanceRepository.insert({
        created_by:actor.id,
        status:
    })
    return {
      id: instanceId,
      workflowId,
      status: instanceStatus,
      currentNodeId: executionResult?.nodeId ?? null,
      context,
      startedAt: new Date(),
    };
  },
};