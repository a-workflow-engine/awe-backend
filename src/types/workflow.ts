import { z } from "zod";
import {
  StartNodeConfigurationSchema,
  EndNodeConfigurationSchema,
  UserNodeConfigurationSchema,
  ServiceNodeConfigurationSchema,
  ScriptNodeConfigurationSchema,
  EmailNodeConfigurationSchema,
  DecisionNodeConfigurationSchema,
  NodeSchema,
  EdgeSchema,
  FetchableSchema,
  StartNodeDataMapSchema,
  RuleSchema,
  DefaultRuleSchema,
  BackoffSchema,
} from "../schemas/node.schema.js";
import type { ActorType, NodeType, Workflow } from "./database.js";
import { NodeTypes } from "./enums.js";
import type { Insertable, Updateable } from "kysely";

export type StartNodeConfiguration = z.infer<
  typeof StartNodeConfigurationSchema
>;

export type EndNodeConfiguration = z.infer<typeof EndNodeConfigurationSchema>;

export type UserNodeConfiguration = z.infer<typeof UserNodeConfigurationSchema>;

export type ServiceNodeConfiguration = z.infer<
  typeof ServiceNodeConfigurationSchema
>;

export type ScriptNodeConfiguration = z.infer<
  typeof ScriptNodeConfigurationSchema
>;

export type EmailNodeConfiguration = z.infer<
  typeof EmailNodeConfigurationSchema
>;

export type DecisionNodeConfiguration = z.infer<
  typeof DecisionNodeConfigurationSchema
>;

export type Node = z.infer<typeof NodeSchema>;

export type Edge = z.infer<typeof EdgeSchema>;

export type NodeInputSchema = {
  variableNames: string[];
  secretNames: string[];
};

export type NodeOuputSchema = {
  variableNames: string[];
};

export type StartNodeDataMap = z.infer<typeof StartNodeDataMapSchema>;

export type Fetchable = z.infer<typeof FetchableSchema>;

export const NodeConfigurationSchemaMap = {
  [NodeTypes.START]: StartNodeConfigurationSchema,
  [NodeTypes.SERVICE]: ServiceNodeConfigurationSchema,
  [NodeTypes.EMAIL]: EmailNodeConfigurationSchema,
  [NodeTypes.SCRIPT]: ScriptNodeConfigurationSchema,
  [NodeTypes.USER]: UserNodeConfigurationSchema,
  [NodeTypes.DECISION]: DecisionNodeConfigurationSchema,
  [NodeTypes.END]: EndNodeConfigurationSchema,
} as const;

export type NodeConfiguration<T extends NodeType = NodeType> = z.infer<
  (typeof NodeConfigurationSchemaMap)[T]
>;

export type DecisionNodeRule = z.infer<typeof RuleSchema>;
export type DecisionNodeDefaultRule = z.infer<typeof DefaultRuleSchema>;

export type BackoffSettings = z.infer<typeof BackoffSchema>;

export type WorkflowDetail = {
  id: string;
  name: string;
  description: string | null;

  createdAt: Date;
  createdBy: ActorType;

  modifiedAt: Date;
  modifiedBy: ActorType;
};

export type WorkflowListItem = {
  id: string;
  name: string;

  activeVersionCount: number;
  draftCount: number;

  modifiedAt: Date;
  modifiedBy: ActorType;
};

export type NewWorkflow = Insertable<Workflow>;

export type UpdateWorkflow = Updateable<Workflow>;
