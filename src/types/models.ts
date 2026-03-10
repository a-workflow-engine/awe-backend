import type { Selectable } from "kysely";
import type {
  Actor,
  ApiKey,
  Edge,
  Environment,
  Node,
  Organization,
  RefreshToken,
  System,
  Workflow,
  WorkflowVersion,
} from "./database.js";
import type {} from "./workflow.js";

export type ActorModel = Selectable<Actor>;

export type OrganizationModel = Selectable<Organization>;

export type SystemModel = Selectable<System>;

export type EnvironmentModel = Selectable<Environment>;

export type RefreshTokenModel = Selectable<RefreshToken>;

export type ApiKeyModel = Selectable<ApiKey>;

export type WorkflowModel = Selectable<Workflow>;

export type WorkflowVersionModel = Selectable<WorkflowVersion>;

export type NodeModel = Selectable<Node>;

export type EdgeModel = Selectable<Edge>;
