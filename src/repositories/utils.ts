import { type ExpressionBuilder } from "kysely";
import type { NodeModel, UserTaskExecutionModel } from "../types/models";

export const USER_TASK_EXECUTION_KEYS: (keyof UserTaskExecutionModel &
  string)[] = [
  "assignee",
  "created_on",
  "ended_on",
  "id",
  "request_variables",
  "response_variables",
  "started_on",
  "status",
  "task_id",
  "title",
];

export const NODE_KEYS: (keyof NodeModel & string)[] = [
  "created_on",
  "id",
  "client_id",
  "configuration",
  "created_by",
  "deleted_by",
  "deleted_on",
  "description",
  "input_schema",
  "is_deleted",
  "max_attempts",
  "modified_by",
  "modified_on",
  "name",
  "output_schema",
  "type",
  "workflow_version_id",
  "x_coordinate",
  "y_coordinate",
];

export function selectAllWithPrefix<DB, TB extends keyof DB & string>(
  eb: ExpressionBuilder<DB, any>,
  table: TB,
  keys: string[],
) {
  return keys.map((col) =>
    eb.ref(`${table}.${col}` as any).as(`${table}_${col}`),
  );
}
