import { instanceRepository } from "../repositories/instance.repository.js";
import type { InstanceCreateSchema } from "../schemas/instance.schema.js";
import type { ActorModel } from "../types/models.js";
import { z } from "zod";
import { workflowVersionService } from "./workflowVersion.service.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { InstanceStatuses } from "../types/enums.js";
import { db } from "../database.js";
import { executionEngine } from "../engine/ExecutionEngine.js";
import { converterUtils } from "../utils/converter.utils.js";

export type CreateVersionInput = z.infer<typeof InstanceCreateSchema>;

export const instanceService = {
  createNew: async (data: CreateVersionInput, actor: ActorModel) => {
    const workflowVersion =
      await workflowVersionService.getActiveVersionByWorkflowId(
        data.workflowId,
      );
    if (!workflowVersion) {
      throw new NotFoundError("No active workflow version found");
    }

    return db.transaction().execute(async (transaction) => {
      const instance = await instanceRepository.insert(
        {
          workflow_version_id: workflowVersion.id,
          started_on: new Date(),
          status: InstanceStatuses.IN_PROGRESS,
          input_variables: converterUtils.objectToJsonValue(data.context),
          created_by: actor.id,
        },
        transaction,
      );

      return executionEngine.start(instance, transaction);
    });
  },
};
