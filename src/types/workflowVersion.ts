import type { Insertable, Updateable } from "kysely";
import type {
  ActorType,
  EnvironmentType,
  WorkflowVersion,
  WorkflowVersionStatus,
} from "./database.js";
import type { Edge, Node } from "./workflow.js";
import z from "zod";
import type { StartVariablesSchema } from "../schemas/node.schema.js";

export type ValidationError = {
  code: number;
  message: string;
  nodeId?: string;
  edgeId?: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

export type WorkflowVersionListItem = {
  id: string;
  version: string | null;
  description: string | null;
  status: WorkflowVersionStatus;

  modifiedAt: Date;
  modifiedBy: ActorType;
};

export type StartVariable = z.infer<typeof StartVariablesSchema>;

export type WorkflowVersionMeta = {
  id: string;
  workflowId: string;

  description: string | null;
  version: string | null;
  status: WorkflowVersionStatus;

  createdAt: Date;
  createdBy: ActorType;

  modifiedAt: Date;
  modifiedBy: ActorType;
};

export type WorkflowDraftMeta = WorkflowVersionMeta &
  ValidationResult & {
    environment: "development";
    startVariables: StartVariable[];
  };

export type WorkflowVersionMetadata = WorkflowVersionMeta & {
  environment: EnvironmentType;
  startVariables: StartVariable[];
};

export type WorkflowVersionDetail = WorkflowVersionMeta & {
  environment: EnvironmentType;

  definition?: {
    nodes: Node[];
    edges: Edge[];
  };

  startVariables: StartVariable[];
};

export type WorkflowDraftDetail = WorkflowVersionDetail & ValidationResult;

export type NewWorkflowVersion = Insertable<WorkflowVersion>;

export type UpdateWorkflowVersion = Updateable<WorkflowVersion>;
