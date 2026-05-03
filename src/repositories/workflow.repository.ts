import { db } from "../database.js";
import type { Workflow } from "../types/database.js";
import type { Insertable, Updateable } from "kysely";
import { RepositoryError } from "../errors/RepositoryError.js";
import type { DbTransaction, WorkflowModel } from "../types/models.js";
import type { WorkflowVersionStatus } from "../types/database.js";
import type { CreatedSort } from "../types/enums.js";
import type { WorkflowListItem } from "../types/workflow.js";

type NewWorkflow = Insertable<Workflow>;
type UpdateWorkflow = Updateable<Workflow>;

export const workflowRepository = {
  findById: async (id: string, transaction?: DbTransaction) => {
    return await (transaction ?? db)
      .selectFrom("workflow")
      .selectAll()
      .where("id", "=", id)
      .where("is_deleted", "=", false)
      .executeTakeFirst();
  },

  findByIdAndEnvironmentIds: async (
    id: string,
    environmentIds: string[],
    transaction?: DbTransaction,
  ) => {
    return await (transaction ?? db)
      .selectFrom("workflow")
      .selectAll()
      .where("id", "=", id)
      .where("environment_id", "in", environmentIds)
      .where("is_deleted", "=", false)
      .executeTakeFirst();
  },

  findByBaseWorkflowIdAndEnvironmentId: async (
    baseWorkflowId: string,
    environmentId: string,
    transaction?: DbTransaction,
  ) => {
    return await (transaction ?? db)
      .selectFrom("workflow")
      .selectAll()
      .where("base_workflow_id", "=", baseWorkflowId)
      .where("environment_id", "=", environmentId)
      .where("is_deleted", "=", false)
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

  updateById: async (
    id: string,
    data: UpdateWorkflow,
    transaction?: DbTransaction,
  ) => {
    try {
      return await (transaction ?? db)
        .updateTable("workflow")
        .set({ ...data })
        .where("id", "=", id)
        .where("is_deleted", "=", false)
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (err) {
      throw new RepositoryError("Update workflow failed", err);
    }
  },

  findByEnvironmentIdsWithLatestVersion: async (
    environmentIds: string[],
    transaction?: DbTransaction,
  ): Promise<
    {
      workflow: WorkflowModel;
      status: WorkflowVersionStatus | null;
      latestWorkflowVersion: number | null;
    }[]
  > => {
    if (environmentIds.length === 0) {
      return [];
    }

    const dbConn = transaction ?? db;

    const workflows = await dbConn
      .selectFrom("workflow")
      .selectAll()
      .where("environment_id", "in", environmentIds)
      .where("is_deleted", "=", false)
      .execute();

    const workflowIds = workflows.map((w) => w.id);

    if (workflowIds.length === 0) {
      return [];
    }

    const versions = await dbConn
      .selectFrom("workflow_version")
      .select(["workflow_id", "version", "status"])
      .where("workflow_id", "in", workflowIds)
      .distinctOn("workflow_id")
      .orderBy("workflow_id")
      .orderBy("version", "desc")
      .execute();

    const versionMap = new Map(
      versions.map((v) => [
        v.workflow_id,
        {
          version: Number(v.version),
          status: v.status,
        },
      ]),
    );

    return workflows.map((wf) => {
      const versionInfo = versionMap.get(wf.id);

      return {
        workflow: wf,
        status: versionInfo?.status ?? null,
        latestWorkflowVersion: versionInfo?.version ?? null,
      };
    });
  },

  countByEnvironmentIds: async (
    environmentIds: string[],
    transaction?: DbTransaction,
  ): Promise<number> => {
    if (environmentIds.length === 0) {
      return 0;
    }

    const result = await (transaction ?? db)
      .selectFrom("workflow")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("environment_id", "in", environmentIds)
      .where("is_deleted", "=", false)
      .executeTakeFirst();

    return result ? Number(result.count) : 0;
  },

  findByWithLatestVersionPaginated: async (data: {
    offset: number;
    limit: number;
    search: string | undefined;
    createdSort: CreatedSort;
    environmentIds: string[];
  }): Promise<{
    items: WorkflowListItem[];
    total: number;
  }> => {
    if (data.environmentIds.length === 0) {
      return { items: [], total: 0 };
    }

    const normalizedSearch = data.search?.trim();
    let workflowsQuery = db
      .selectFrom("workflow")
      .innerJoin("environment", "environment.id", "workflow.environment_id")
      .innerJoin("actor", "actor.id", "workflow.modified_by")
      .leftJoin(
        db
          .selectFrom("workflow_version")
          .select([
            "workflow_version.id",
            "workflow_version.workflow_id",
            "workflow_version.version",
            "workflow_version.status",
          ])
          .distinctOn("workflow_version.workflow_id")
          .orderBy("workflow_version.workflow_id")
          .orderBy("workflow_version.modified_on", "desc")
          .as("wv"),
        (join) => join.onRef("wv.workflow_id", "=", "workflow.id"),
      )
      .select((eb) => [
        eb.ref("workflow.id").as("workflow_id"),
        eb.ref("workflow.name").as("workflow_name"),
        eb.ref("workflow.description").as("workflow_description"),
        eb.ref("workflow.modified_on").as("workflow_modified_on"),

        eb.ref("wv.id").as("workflow_version_id"),
        eb.ref("wv.version").as("workflow_version_version"),
        eb.ref("wv.status").as("workflow_version_status"),

        eb.ref("environment.type").as("environment_type"),
        eb.ref("actor.type").as("actor_type"),
        eb.fn.countAll().over().as("total_count"),
      ])
      .orderBy("workflow.created_on", data.createdSort)
      .limit(data.limit)
      .offset(data.offset)
      .where("workflow.environment_id", "in", data.environmentIds)
      .where("workflow.is_deleted", "=", false);

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
        const id = res.workflow_version_id;
        const version = res.workflow_version_version;
        const status = res.workflow_version_status;

        return {
          id: res.workflow_id,
          name: res.workflow_name,
          description: res.workflow_description,
          environment: res.environment_type,
          modifiedAt: res.workflow_modified_on,
          modifiedBy: res.actor_type,

          latestVersion:
            id && version && status ? { id, version, status } : null,
        };
      }),
    };
  },
};
