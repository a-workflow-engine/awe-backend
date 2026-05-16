import type { Insertable, Selectable } from "kysely";
import type {
  WorkflowActiveDeployment,
  WorkflowDeployment,
} from "./database.js";

export type WorkflowDeploymentModel = Selectable<WorkflowDeployment>;
export type NewWorkflowDeployment = Insertable<WorkflowDeployment>;

export type WorkflowActiveDeploymentModel =
  Selectable<WorkflowActiveDeployment>;
export type NewWorkflowActiveDeployment = Insertable<WorkflowActiveDeployment>;
