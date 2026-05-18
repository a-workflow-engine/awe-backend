import { db } from "../database.js";
import { RepositoryError } from "../errors/RepositoryError.js";
import type {
  NewWorkflowDeployment,
  WorkflowDeploymentModel,
} from "../types/environment.js";
import type { DbTransaction } from "../types/models.js";

export const workflowDeploymentRepository = {
  insert: async (
    data: NewWorkflowDeployment,
    transaction?: DbTransaction,
  ): Promise<WorkflowDeploymentModel> => {
    return await (transaction ?? db)
      .insertInto("workflow_deployment")
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow()
      .catch((err) => {
        throw new RepositoryError(
          "Failed to insert workflow deployment record",
          err,
        );
      });
  },
};
