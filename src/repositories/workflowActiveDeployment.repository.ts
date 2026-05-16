import { db } from "../database.js";

export const workflowActiveDeploymentRepository = {
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
