import type { Insertable, Transaction } from "kysely";
import type { DB, InstanceLog } from "../types/database.js";
import { db } from "../database.js";
import { RepositoryError } from "../errors/RepositoryError.js";
import type { InstanceEntityType, InstanceEventType } from "../types/database.js";
export type NewInstanceLog = Insertable<InstanceLog>;

export const instanceLogRepository = {
  insert: async (data: NewInstanceLog, transaction?: Transaction<DB>) => {
    try {
      return await (transaction ?? db)
        .insertInto("instance_log")
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (err) {
      throw new RepositoryError("Insert instance log failed", err);
    }
  },

  getInstanceHistory: async (
    instanceId: string,
    filters?: {
      entityTypes?: InstanceEntityType[];
      createdBy?: string;
      eventTypes?: InstanceEventType[];
    },
    sortOrder: "asc" | "desc" = "asc"
  ) => {
    try {
      let query = db
        .selectFrom("instance_log")
        .select((eb) => [
          eb.ref("id").as("id"),
          eb.ref("instance_id").as("instanceId"),
          eb.ref("entity_type").as("entityType"),
          eb.ref("entity_id").as("entityId"),
          eb.ref("event_type").as("eventType"),
          eb.ref("details").as("details"),
          eb.ref("created_by").as("createdBy"),
          eb.ref("created_on").as("createdOn")
        ])
        .where("instance_id", "=", instanceId);

      if (filters?.entityTypes) {
        query = query.where("entity_type", "in", filters.entityTypes);
      }
      if (filters?.eventTypes) {
        query = query.where("event_type", "in", filters.eventTypes);
      }
      if (filters?.createdBy) {
        query = query.where("created_by", "=", filters.createdBy);
      }

      return await query.orderBy("created_on", sortOrder).execute();
    } catch (err) {
      throw new RepositoryError("Find instance logs by instance ID failed", err);
    }
  },
};