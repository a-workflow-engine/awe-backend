import { db } from "../database.js";
import { RepositoryError } from "../errors/RepositoryError.js";
import type {
  DbTransaction,
  NodeModel,
  WorkflowModel,
  WorkflowVersionModel,
} from "../types/models.js";
import { NodeTypes, WorkflowVersionStatuses } from "../types/enums.js";
import { columnMapper } from "./utils/columnMapper.util.js";
import {
  nodeColumns,
  workflowActiveDeploymentColumns,
  workflowColumns,
  workflowDeploymentColumns,
  workflowVersionColumns,
} from "../types/columnNames.js";
import type {
  NewWorkflowVersion,
  UpdateWorkflowVersion,
  WorkflowVersionListItem,
  WorkflowVersionMeta,
} from "../types/workflowVersion.js";
import type {
  WorkflowActiveDeploymentModel,
  WorkflowDeploymentModel,
} from "../types/environment.js";

export const workflowVersionRepository = {
  findIdAndOrganizationId: async (
    id: string,
    organizationId: string,
  ): Promise<WorkflowVersionModel | undefined> => {
    return await db
      .selectFrom("workflow_version")
      .innerJoin("workflow", (join) =>
        join
          .onRef("workflow.id", "=", "workflow_version.workflow_id")
          .on("workflow.organization_id", "=", organizationId),
      )
      .selectAll("workflow_version")
      .where("workflow_version.is_deleted", "=", false)
      .where("workflow_version.id", "=", id)
      .executeTakeFirst();
  },

  findByIdAndOrganizationIdAsDraftMeta: async (
    versionId: string,
    organizationId: string,
  ): Promise<WorkflowVersionMeta | undefined> => {
    return await db
      .selectFrom("workflow_version")
      .innerJoin("workflow", (join) =>
        join
          .onRef("workflow.id", "=", "workflow_version.workflow_id")
          .on("workflow.organization_id", "=", organizationId),
      )
      .innerJoin("actor as creator", "creator.id", "workflow.created_by")
      .innerJoin("actor as modifier", "modifier.id", "workflow.modified_by")
      .select((eb) => [
        eb.ref("workflow_version.id").as("id"),
        eb.ref("workflow_version.workflow_id").as("workflowId"),
        eb.ref("workflow_version.description").as("description"),
        eb.ref("workflow_version.version").as("version"),
        eb.ref("workflow_version.status").as("status"),
        eb.ref("workflow_version.created_on").as("createdAt"),
        eb.ref("workflow_version.modified_on").as("modifiedAt"),

        eb.ref("creator.type").as("createdBy"),
        eb.ref("modifier.type").as("modifiedBy"),
      ])
      .where("workflow_version.id", "=", versionId)
      .where("workflow_version.status", "in", [
        WorkflowVersionStatuses.DRAFT,
        WorkflowVersionStatuses.VALID,
      ])
      .where("workflow_version.is_deleted", "=", false)
      .executeTakeFirst();
  },

  findByIdAndEnvironmentIdAsMeta: async (
    versionId: string,
    ...environmentIds: string[]
  ): Promise<WorkflowVersionMeta | undefined> => {
    return await db
      .selectFrom("workflow_version")
      .innerJoin("workflow_deployment", (join) =>
        join
          .onRef(
            "workflow_deployment.workflow_version_id",
            "=",
            "workflow_version.id",
          )
          .on("workflow_deployment.environment_id", "in", environmentIds),
      )
      .innerJoin("workflow", "workflow.id", "workflow_version.workflow_id")
      .innerJoin("actor as creator", "creator.id", "workflow.created_by")
      .innerJoin("actor as modifier", "modifier.id", "workflow.modified_by")
      .leftJoin("workflow_active_deployment", (join) =>
        join
          .onRef(
            "workflow_active_deployment.deployment_id",
            "=",
            "workflow_deployment.id",
          )
          .onRef(
            "workflow_active_deployment.workflow_id",
            "=",
            "workflow_version.workflow_id",
          )
          .onRef(
            "workflow_active_deployment.major_version",
            "=",
            "workflow_version.major_version",
          )
          .on(
            "workflow_active_deployment.environment_id",
            "in",
            environmentIds,
          ),
      )
      .select((eb) => [
        eb.ref("workflow_version.id").as("id"),
        eb.ref("workflow_version.workflow_id").as("workflowId"),
        eb.ref("workflow_version.description").as("description"),
        eb.ref("workflow_version.version").as("version"),

        eb
          .case()
          .when(
            eb.ref("workflow_active_deployment.deployment_id"),
            "is not",
            eb.lit(null),
          )
          .then(WorkflowVersionStatuses.ACTIVE)
          .else(eb.ref("workflow_version.status"))
          .end()
          .as("status"),

        eb.ref("workflow_version.created_on").as("createdAt"),
        eb.ref("workflow_version.modified_on").as("modifiedAt"),

        eb.ref("creator.type").as("createdBy"),
        eb.ref("modifier.type").as("modifiedBy"),
      ])
      .where("workflow_version.id", "=", versionId)
      .where("workflow_version.status", "=", WorkflowVersionStatuses.PUBLISHED)
      .where("workflow_version.is_deleted", "=", false)
      .executeTakeFirst();
  },

  findByIdAndEnvironmentIdWithDeployment: async (
    versionId: string,
    ...environmentIds: string[]
  ): Promise<
    | {
        workflowVersion: WorkflowVersionModel;
        deployment: WorkflowDeploymentModel;
        activeDeployment: WorkflowActiveDeploymentModel | undefined;
      }
    | undefined
  > => {
    const result = await db
      .selectFrom("workflow_version")
      .innerJoin("workflow", "workflow.id", "workflow_version.workflow_id")
      .innerJoin("actor as creator", "creator.id", "workflow.created_by")
      .innerJoin("actor as modifier", "modifier.id", "workflow.modified_by")
      .innerJoin("workflow_deployment", (join) =>
        join
          .onRef(
            "workflow_deployment.workflow_version_id",
            "=",
            "workflow_version.id",
          )
          .on("workflow_deployment.environment_id", "in", environmentIds),
      )
      .leftJoin("workflow_active_deployment", (join) =>
        join
          .onRef(
            "workflow_active_deployment.deployment_id",
            "=",
            "workflow_deployment.id",
          )
          .onRef(
            "workflow_active_deployment.workflow_id",
            "=",
            "workflow_version.workflow_id",
          )
          .onRef(
            "workflow_active_deployment.major_version",
            "=",
            "workflow_version.major_version",
          )
          .on(
            "workflow_active_deployment.environment_id",
            "in",
            environmentIds,
          ),
      )
      .select((eb) => [
        ...columnMapper.prefixedColumns(
          eb,
          "workflow_version",
          workflowVersionColumns,
        ),
        ...columnMapper.prefixedColumns(
          eb,
          "workflow_deployment",
          workflowDeploymentColumns,
        ),
        ...columnMapper.prefixedColumns(
          eb,
          "workflow_active_deployment",
          workflowActiveDeploymentColumns,
        ),
      ])
      .where("workflow_version.id", "=", versionId)
      .where("workflow_version.status", "=", WorkflowVersionStatuses.PUBLISHED)
      .where("workflow_version.is_deleted", "=", false)
      .executeTakeFirst();

    if (!result) {
      return result;
    }

    return {
      workflowVersion: columnMapper.extractPrefixed(result, "workflow_version"),
      deployment: columnMapper.extractPrefixed(result, "workflow_deployment"),
      activeDeployment: result.workflow_active_deployment__deployment_id
        ? columnMapper.extractPrefixed(result, "workflow_active_deployment")
        : undefined,
    };
  },

  findLatestNonNullVersionByWorkflowId: async (workflowId: string) => {
    return await db
      .selectFrom("workflow_version")
      .selectAll()
      .where("workflow_id", "=", workflowId)
      .where("version", "is not", null)
      .orderBy("modified_on", "desc")
      .limit(1)
      .executeTakeFirst();
  },

  findPaginatedDrafts: async (data: {
    workflowId?: string | undefined;
    organizationId: string;
    offset: number;
    limit: number;
  }): Promise<{ items: WorkflowVersionListItem[]; total: number }> => {
    let query = db
      .selectFrom("workflow_version")
      .innerJoin("actor", "actor.id", "workflow_version.modified_by")
      .innerJoin("workflow", (join) =>
        join
          .onRef("workflow.id", "=", "workflow_version.workflow_id")
          .on("workflow.organization_id", "=", data.organizationId),
      )
      .select((eb) => [
        eb.ref("workflow_version.id").as("id"),
        eb.ref("workflow_version.version").as("version"),
        eb.ref("workflow_version.description").as("description"),
        eb.ref("workflow_version.status").as("status"),
        eb.ref("workflow_version.modified_on").as("modifiedAt"),

        eb.ref("actor.type").as("modifiedBy"),

        eb.fn.countAll().over().as("total_count"),
      ])
      .where("workflow_version.is_deleted", "=", false)
      .where("workflow_version.status", "in", [
        WorkflowVersionStatuses.DRAFT,
        WorkflowVersionStatuses.VALID,
      ])
      .orderBy("workflow_version.version", "desc")
      .orderBy("workflow_version.modified_on", "desc")
      .limit(data.limit)
      .offset(data.offset);

    const workflowId = data.workflowId;
    if (workflowId) {
      query = query.where("workflow_version.workflow_id", "=", workflowId);
    }

    const results = await query.execute();

    return {
      total: results[0] ? Number(results[0].total_count) : 0,
      items: results.map(({ total_count, ...rest }) => rest),
    };
  },

  findPaginated: async (data: {
    workflowId?: string | undefined;
    environmentId: string;
    offset: number;
    limit: number;
  }): Promise<{ items: WorkflowVersionListItem[]; total: number }> => {
    let query = db
      .selectFrom("workflow_version")
      .innerJoin("actor", "actor.id", "workflow_version.modified_by")
      .innerJoin("workflow_deployment", (join) =>
        join
          .onRef(
            "workflow_deployment.workflow_version_id",
            "=",
            "workflow_version.id",
          )
          .on("workflow_deployment.environment_id", "=", data.environmentId),
      )
      .leftJoin("workflow_active_deployment", (join) =>
        join
          .onRef(
            "workflow_active_deployment.deployment_id",
            "=",
            "workflow_deployment.id",
          )
          .onRef(
            "workflow_active_deployment.workflow_id",
            "=",
            "workflow_version.workflow_id",
          )
          .onRef(
            "workflow_active_deployment.major_version",
            "=",
            "workflow_version.major_version",
          )
          .on(
            "workflow_active_deployment.environment_id",
            "=",
            data.environmentId,
          ),
      )
      .select((eb) => [
        eb.ref("workflow_version.id").as("id"),
        eb.ref("workflow_version.version").as("version"),
        eb.ref("workflow_version.description").as("description"),

        eb
          .case()
          .when(
            eb.ref("workflow_active_deployment.deployment_id"),
            "is not",
            eb.lit(null),
          )
          .then(WorkflowVersionStatuses.ACTIVE)
          .else(eb.ref("workflow_version.status"))
          .end()
          .as("status"),

        eb.ref("workflow_version.modified_on").as("modifiedAt"),

        eb.ref("actor.type").as("modifiedBy"),

        eb.fn.countAll().over().as("total_count"),
      ])
      .where("workflow_version.is_deleted", "=", false)
      .where("workflow_version.status", "=", WorkflowVersionStatuses.PUBLISHED)
      .orderBy("workflow_version.version", "desc")
      .orderBy("workflow_version.modified_on", "desc")
      .limit(data.limit)
      .offset(data.offset);

    const workflowId = data.workflowId;
    if (workflowId) {
      query = query.where("workflow_version.workflow_id", "=", workflowId);
    }

    const results = await query.execute();

    return {
      total: results[0] ? Number(results[0].total_count) : 0,
      items: results.map(({ total_count, ...rest }) => rest),
    };
  },

  findByWorkflowIdAndVersion: async (
    workflowId: string,
    version: string,
    transaction?: DbTransaction,
  ): Promise<WorkflowVersionModel> => {
    try {
      return await (transaction ?? db)
        .selectFrom("workflow_version")
        .selectAll()
        .where("workflow_id", "=", workflowId)
        .where("version", "=", version)
        .executeTakeFirstOrThrow();
    } catch (err) {
      throw new RepositoryError(
        `Workflow version search for workflowId=${workflowId} and version=${version} failed`,
        err,
      );
    }
  },

  findActiveVersionByWorkflowIdWithRelations: async (
    workflowId: string,
  ): Promise<
    | {
        workflow: WorkflowModel;
        workflowVersion: WorkflowVersionModel;
        startNode: NodeModel;
      }
    | undefined
  > => {
    const result = await db
      .selectFrom("workflow_version")
      .innerJoin("workflow", "workflow.id", "workflow_version.workflow_id")
      .innerJoin("node", "node.workflow_version_id", "workflow_version.id")
      .select((eb) => [
        ...columnMapper.prefixedColumns<WorkflowModel>(
          eb,
          "workflow",
          workflowColumns,
        ),
        ...columnMapper.prefixedColumns<WorkflowVersionModel>(
          eb,
          "workflow_version",
          workflowVersionColumns,
        ),
        ...columnMapper.prefixedColumns<NodeModel>(eb, "node", nodeColumns),
      ])
      .where("workflow_version.workflow_id", "=", workflowId)
      .where("workflow_version.status", "=", WorkflowVersionStatuses.ACTIVE)
      .where("workflow.is_deleted", "=", false)
      .where("node.type", "=", NodeTypes.START)
      .limit(1)
      .executeTakeFirst();

    if (!result) {
      return result;
    }

    return {
      workflow: columnMapper.extractPrefixed<WorkflowModel>(result, "workflow"),
      workflowVersion: columnMapper.extractPrefixed<WorkflowVersionModel>(
        result,
        "workflow_version",
      ),
      startNode: columnMapper.extractPrefixed<NodeModel>(result, "node"),
    };
  },

  insert: async (data: NewWorkflowVersion, transaction?: DbTransaction) => {
    try {
      return await (transaction ?? db)
        .insertInto("workflow_version")
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (err) {
      throw new RepositoryError("Insert workflow version failed", err);
    }
  },

  updateById: async (
    id: string,
    data: UpdateWorkflowVersion,
    transaction?: DbTransaction,
  ): Promise<WorkflowVersionModel> => {
    try {
      return await (transaction ?? db)
        .updateTable("workflow_version")
        .set({ ...data })
        .where("id", "=", id)
        .where("is_deleted", "=", false)
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (err) {
      throw new RepositoryError("Update workflow version failed", err);
    }
  },

  updateByWorkflowId: async (
    id: string,
    data: UpdateWorkflowVersion,
    transaction?: DbTransaction,
  ): Promise<void> => {
    try {
      await (transaction ?? db)
        .updateTable("workflow_version")
        .set({ ...data })
        .where("workflow_id", "=", id)
        .where("is_deleted", "=", false)
        .execute();
    } catch (err) {
      throw new RepositoryError("Update workflow version failed", err);
    }
  },
};
