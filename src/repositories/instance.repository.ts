import { type Insertable, type Transaction, type Updateable } from "kysely";
import type { DB, Instance } from "../types/database.js";
import type { InstanceModel } from "../types/models.js";
import { db } from "../database.js";
import { RepositoryError } from "../errors/RepositoryError.js";

export type NewInstance = Insertable<Instance>;
export type UpdateInstance = Updateable<Instance>;

export const instanceRepository = {
  findById: async (
    id: string,
    transaction?: Transaction<DB>,
  ): Promise<InstanceModel | undefined> => {
    try {
      return await (transaction ?? db)
        .selectFrom("instance")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    } catch (err) {
      throw new RepositoryError(`Find instance by id=${id} failed`, err);
    }
  },

  insert: async (data: NewInstance, transaction?: Transaction<DB>) => {
    try {
      return await (transaction ?? db)
        .insertInto("instance")
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (err) {
      throw new RepositoryError("Insert instance failed", err);
    }
  },

  updateById: async (
    id: string,
    data: UpdateInstance,
    transaction?: Transaction<DB>,
  ) => {
    try {
      return await (transaction ?? db)
        .updateTable("instance")
        .set(data)
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (err) {
      throw new RepositoryError("Update instance failed", err);
    }
  },
};
