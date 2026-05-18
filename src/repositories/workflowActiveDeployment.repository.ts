import { db } from "../database.js";
import { RepositoryError } from "../errors/RepositoryError.js";
import type {
  NewWorkflowActiveDeployment,
  WorkflowActiveDeploymentModel,
} from "../types/environment.js";
import type { DbTransaction } from "../types/models.js";

export const workflowActiveDeploymentRepository = {
  upsert: async (
    data: NewWorkflowActiveDeployment,
    transaction?: DbTransaction,
  ): Promise<WorkflowActiveDeploymentModel> => {
    return await (transaction ?? db)
      .insertInto("workflow_active_deployment")
      .values(data)
      .onConflict((ocb) =>
        ocb
          .columns(["workflow_id", "environment_id", "major_version"])
          .doUpdateSet({ deployment_id: data.deployment_id }),
      )
      .returningAll()
      .executeTakeFirstOrThrow()
      .catch((err) => {
        throw new RepositoryError(
          "Failed to insert workflow active deployment record",
          err,
        );
      });
  },

  delete: async (
    environmentId: string,
    workflowId: string,
    deploymentId: string,
    majorVersion: number,
  ): Promise<void> => {
    await db
      .deleteFrom("workflow_active_deployment")
      .where("environment_id", "=", environmentId)
      .where("workflow_id", "=", workflowId)
      .where("deployment_id", "=", deploymentId)
      .where("major_version", "=", majorVersion)
      .execute();
  },

  existsByWorkflowIdAndEnvironmentIds: async (
    workflowId: string,
    environmentIds: string[],
  ): Promise<boolean> => {
    if (environmentIds.length === 0) {
      return false;
    }

    const result = await db
      .selectFrom("workflow_active_deployment")
      .select("deployment_id")
      .where("workflow_id", "=", workflowId)
      .where("environment_id", "in", environmentIds)
      .limit(1)
      .executeTakeFirst();

    return !!result;
  },
};
