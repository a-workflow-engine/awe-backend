import { sql } from "kysely";
import type { WorkflowVersionStatus } from "../types/database.js";
import { db } from "../database.js";
import { RepositoryError } from "../errors/RepositoryError.js";
import type {
  ActorModel,
  DbTransaction,
  NodeModel,
  WorkflowModel,
  WorkflowVersionModel,
} from "../types/models.js";
import { NodeTypes, WorkflowVersionStatuses } from "../types/enums.js";
import { columnMapper } from "./utils/columnMapper.util.js";
import {
  actorColumns,
  nodeColumns,
  workflowColumns,
  workflowVersionColumns,
} from "../types/columnNames.js";
import type {
  NewWorkflowVersion,
  UpdateWorkflowVersion,
  WorkflowVersionListItem,
  WorkflowVersionMeta,
} from "../types/workflowVersion.js";

export const workflowVersionRepository = {
  findByIdAndOrganizationIdAsMeta: async (
    versionId: string,
    organizationId: string,
    statuses: WorkflowVersionStatus[] = [],
  ): Promise<WorkflowVersionMeta | undefined> => {
    let query = db
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
      .where("workflow_version.is_deleted", "=", false);

    if (statuses.length > 0) {
      query = query.where("workflow_version.status", "in", statuses);
    }

    return query.executeTakeFirst();
  },

  findByIdWithModifierActor: async (
    id: string,
  ): Promise<
    | {
        workflowVersion: WorkflowVersionModel;
        modifierActor: ActorModel;
      }
    | undefined
  > => {
    const result = await db
      .selectFrom("workflow_version")
      .innerJoin("workflow", "workflow.id", "workflow_version.workflow_id")
      .innerJoin("actor", "actor.id", "workflow_version.modified_by")
      .select((eb) => [
        ...columnMapper.prefixedColumns<WorkflowVersionModel>(
          eb,
          "workflow_version",
          workflowVersionColumns,
        ),
        ...columnMapper.prefixedColumns<ActorModel>(eb, "actor", actorColumns),
      ])
      .where("workflow_version.id", "=", id)
      .where("workflow.is_deleted", "=", false)
      .executeTakeFirst();

    if (!result) {
      return result;
    }

    return {
      workflowVersion: columnMapper.extractPrefixed<WorkflowVersionModel>(
        result,
        "workflow_version",
      ),
      modifierActor: columnMapper.extractPrefixed<ActorModel>(result, "actor"),
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

  findPaginated: async (data: {
    workflowId?: string | undefined;
    offset: number;
    limit: number;
    organizationId: string;
    statuses: WorkflowVersionStatus[];
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
      .orderBy("workflow_version.version", "desc")
      .orderBy("workflow_version.modified_on", "desc")
      .limit(data.limit)
      .offset(data.offset);

    if (data.workflowId) {
      query = query.where("workflow_version.workflow_id", "=", data.workflowId);
    }

    if (data.statuses.length > 0) {
      query = query.where("workflow_version.status", "in", data.statuses);
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
