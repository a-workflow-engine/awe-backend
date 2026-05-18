import { db } from "../database.js";
import { RepositoryError } from "../errors/RepositoryError.js";
import type { DbTransaction, WorkflowModel } from "../types/models.js";
import { WorkflowVersionStatuses, type SortType } from "../types/enums.js";
import type {
  NewWorkflow,
  UpdateWorkflow,
  WorkflowDetail,
  WorkflowListItem,
} from "../types/workflow.js";

export const workflowRepository = {
  findById: async (id: string, transaction?: DbTransaction) => {
    return await (transaction ?? db)
      .selectFrom("workflow")
      .selectAll()
      .where("id", "=", id)
      .where("is_deleted", "=", false)
      .executeTakeFirst();
  },

  findByIdAndOrganizationIdInDetail: async (
    workflowId: string,
    organizationId: string,
  ): Promise<WorkflowDetail | undefined> => {
    return await db
      .selectFrom("workflow")
      .innerJoin("organization", "organization.id", "workflow.organization_id")
      .innerJoin("actor as creator", "creator.id", "workflow.created_by")
      .innerJoin("actor as modifier", "modifier.id", "workflow.modified_by")
      .select((eb) => [
        eb.ref("workflow.id").as("id"),
        eb.ref("workflow.name").as("name"),
        eb.ref("workflow.description").as("description"),

        eb.ref("workflow.created_on").as("createdAt"),
        eb.ref("creator.type").as("createdBy"),

        eb.ref("workflow.modified_on").as("modifiedAt"),
        eb.ref("modifier.type").as("modifiedBy"),
      ])
      .where("workflow.id", "=", workflowId)
      .where("workflow.organization_id", "=", organizationId)
      .where("workflow.is_deleted", "=", false)
      .executeTakeFirst();
  },

  insert: async (
    data: NewWorkflow,
    transaction?: DbTransaction,
  ): Promise<WorkflowModel> => {
    try {
      return await (transaction ?? db)
        .insertInto("workflow")
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (err) {
      throw new RepositoryError("Workflow insert failed", err);
    }
  },

  updateByIdAndOrganizationId: async (
    id: string,
    organizationId: string,
    data: UpdateWorkflow,
    transaction?: DbTransaction,
  ): Promise<WorkflowModel | undefined> => {
    return await (transaction ?? db)
      .updateTable("workflow")
      .set(data)
      .where("id", "=", id)
      .where("organization_id", "=", organizationId)
      .where("is_deleted", "=", false)
      .returningAll()
      .executeTakeFirst();
  },

  countByOrganizationId: async (
    organizationId: string,
    transaction?: DbTransaction,
  ): Promise<number> => {
    const result = await (transaction ?? db)
      .selectFrom("workflow")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("organization_id", "=", organizationId)
      .where("is_deleted", "=", false)
      .executeTakeFirst();

    return result ? Number(result.count) : 0;
  },

  findPaginated: async (data: {
    offset: number;
    limit: number;
    search: string | undefined;
    createdSort: SortType;
    environmentId: string;
  }): Promise<{
    items: WorkflowListItem[];
    total: number;
  }> => {
    const normalizedSearch = data.search?.trim();
    let workflowsQuery = db
      .selectFrom("workflow")
      .innerJoin("actor", "actor.id", "workflow.modified_by")
      .leftJoin("workflow_version", (join) =>
        join
          .onRef("workflow_version.workflow_id", "=", "workflow.id")
          .on("workflow_version.status", "=", WorkflowVersionStatuses.DRAFT),
      )
      .leftJoin("workflow_active_deployment", (join) =>
        join
          .onRef("workflow_active_deployment.workflow_id", "=", "workflow.id")
          .on(
            "workflow_active_deployment.environment_id",
            "=",
            data.environmentId,
          ),
      )
      .select((eb) => [
        eb.ref("workflow.id").as("workflow_id"),
        eb.ref("workflow.name").as("workflow_name"),

        eb.ref("workflow.modified_on").as("workflow_modified_on"),
        eb.ref("actor.type").as("workflow_modifier_actor_type"),

        eb.fn.count("workflow_version.id").distinct().as("draft_count"),
        eb.fn
          .count("workflow_active_deployment.deployment_id")
          .distinct()
          .as("active_count"),

        eb.fn.countAll().over().as("total_count"),
      ])
      .where("workflow.is_deleted", "=", false)
      .groupBy(["workflow.id", "actor.type"])
      .orderBy("workflow.created_on", data.createdSort)
      .limit(data.limit)
      .offset(data.offset);

    if (normalizedSearch) {
      const searchPattern = `%${normalizedSearch}%`;
      workflowsQuery = workflowsQuery.where((eb) =>
        eb.or([
          eb("workflow.name", "ilike", searchPattern),
          eb("workflow.description", "ilike", searchPattern),
        ]),
      );
    }

    const results = await workflowsQuery.execute();

    return {
      total: results[0] ? Number(results[0].total_count) : 0,
      items: results.map((res) => {
        return {
          id: res.workflow_id,
          name: res.workflow_name,

          activeVersionCount: Number(res.active_count),
          draftCount: Number(res.draft_count),

          modifiedAt: res.workflow_modified_on,
          modifiedBy: res.workflow_modifier_actor_type,
        };
      }),
    };
  },
};
