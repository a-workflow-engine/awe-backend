import { db, DbErrorCode, isDbError } from "../database.js";
import { DuplicateError } from "../errors/DuplicateError.js";
import { RepositoryError } from "../errors/RepositoryError.js";
import type { DB, Organization } from "../types/database.js";
import type { Insertable, Transaction, Updateable } from "kysely";
import type {
  ActorModel,
  EnvironmentModel,
  OrganizationModel,
  SystemModel,
} from "../types/models.js";
import { columnMapper } from "./utils/columnMapper.util.js";
import {
  actorColumns,
  environmentColumns,
  organizationColumns,
  systemColumns,
} from "../types/columnNames.js";

type NewOrganization = Insertable<Organization>;
type UpdateOrganization = Updateable<Organization>;

export const organizationRepository = {
  findById: async (id: string, transaction?: Transaction<DB>) => {
    return await (transaction ?? db)
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", id)
      .where("is_deleted", "=", false)
      .executeTakeFirst();
  },

  findByEmail: async (email: string, transaction?: Transaction<DB>) => {
    return await (transaction ?? db)
      .selectFrom("organization")
      .selectAll()
      .where("email", "=", email)
      .where("is_deleted", "=", false)
      .executeTakeFirst();
  },

  findByActorId: async (actorId: string, transaction?: Transaction<DB>) => {
    return await (transaction ?? db)
      .selectFrom("organization")
      .selectAll()
      .where("actor_id", "=", actorId)
      .executeTakeFirst();
  },

  findByActorIdWithEnvironments: async (
    actorId: string,
  ): Promise<
    | {
        organization: OrganizationModel;
        environments: EnvironmentModel[];
      }
    | undefined
  > => {
    const rows = await db
      .selectFrom("organization")
      .innerJoin(
        "environment",
        "environment.organization_id",
        "organization.id",
      )
      .select((eb) => [
        ...columnMapper.prefixedColumns<OrganizationModel>(
          eb,
          "organization",
          organizationColumns,
        ),
        ...columnMapper.prefixedColumns<EnvironmentModel>(
          eb,
          "environment",
          environmentColumns,
        ),
      ])
      .where("organization.actor_id", "=", actorId)
      .where("organization.is_deleted", "=", false)
      .execute();

    if (!rows[0]) {
      return undefined;
    }

    return {
      organization: columnMapper.extractPrefixed<OrganizationModel>(
        rows[0],
        "organization",
      ),
      environments: rows.map((row) =>
        columnMapper.extractPrefixed<EnvironmentModel>(row, "environment"),
      ),
    };
  },

  findByEmailWithRelations: async (
    email: string,
    transaction?: Transaction<DB>,
  ): Promise<
    | {
        organization: OrganizationModel;
        actor: ActorModel;
        system: SystemModel;
      }
    | undefined
  > => {
    const result = await (transaction ?? db)
      .selectFrom("organization")
      .innerJoin("actor", "actor.id", "organization.actor_id")
      .innerJoin("system", "system.organization_id", "organization.id")
      .innerJoin("environment", "environment.system_id", "system.id")
      .where("organization.email", "=", email)
      .where("organization.is_deleted", "=", false)
      .where("system.is_deleted", "=", false)
      .where("environment.is_deleted", "=", false)
      .select((eb) => [
        ...columnMapper.prefixedColumns<OrganizationModel>(
          eb,
          "organization",
          organizationColumns,
        ),

        ...columnMapper.prefixedColumns<ActorModel>(eb, "actor", actorColumns),

        ...columnMapper.prefixedColumns<SystemModel>(
          eb,
          "system",
          systemColumns,
        ),
      ])
      .executeTakeFirst();

    if (!result) {
      return result;
    }

    return {
      organization: columnMapper.extractPrefixed<OrganizationModel>(
        result,
        "organization",
      ),
      actor: columnMapper.extractPrefixed<ActorModel>(result, "actor"),
      system: columnMapper.extractPrefixed<SystemModel>(result, "system"),
    };
  },

  insert: async (
    data: NewOrganization,
    transaction?: Transaction<DB>,
  ): Promise<OrganizationModel> => {
    try {
      return await (transaction ?? db)
        .insertInto("organization")
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (err) {
      if (
        isDbError(err) &&
        err.code === DbErrorCode.UNIQUE_VIOLATION &&
        err.constraint === "organization_email_key"
      ) {
        throw new DuplicateError("Email");
      }

      throw new RepositoryError("Organization insert failed", err);
    }
  },

  updateById: async (
    id: string,
    data: UpdateOrganization,
    transaction?: Transaction<DB>,
  ) => {
    if (!Object.keys(data).length) {
      return null;
    }

    return await (transaction ?? db)
      .updateTable("organization")
      .set({ ...data, modified_on: new Date() })
      .where("id", "=", id)
      .where("is_deleted", "=", false)
      .returningAll()
      .executeTakeFirst();
  },

  deleteById: async (id: string, transaction?: Transaction<DB>) => {
    return await (transaction ?? db)
      .updateTable("organization")
      .set({ is_deleted: true, deleted_on: new Date() })
      .where("id", "=", id)
      .where("is_deleted", "=", false)
      .returningAll()
      .executeTakeFirst();
  },
};
