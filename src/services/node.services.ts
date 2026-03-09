import type { Transaction } from "kysely";
import type { ActorModel, WorkflowVersionModel } from "../types/models.js";
import type { Node } from "../types/workflow.js";
import type { DB } from "../types/database.js";
import { nodeRepository } from "../repositories/node.repository.js";
import { NodeTypes } from "../types/enums.js";

export const nodeService = {
  createMany: async (
    data: Node[],
    actor: ActorModel,
    workflowVersion: WorkflowVersionModel,
    transaction?: Transaction<DB>,
  ) => {
    const nodes = data.map((node) => {
      const maxAttempts =
        node.type === NodeTypes.START ||
        node.type === NodeTypes.END ||
        node.type === NodeTypes.DECISION
          ? null
          : node.configuration.maxAttempts;

      return {
        client_id: node.id,
        configuration: JSON.stringify(node.configuration),
        created_by: actor.id,
        description: node.description ?? null,
        is_deleted: false,
        max_attempts: maxAttempts ?? 1,
        modified_by: actor.id,
        name: node.label ?? null,
        type: node.type,
        workflow_version_id: workflowVersion.id,
        x_coordinate: node.position?.x ?? null,
        y_coordinate: node.position?.y ?? null,
      };
    });

    return await nodeRepository.insertMany(nodes, transaction);
  },
};
