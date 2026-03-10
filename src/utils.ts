import type { EdgeModel, NodeModel } from "./types/models.js";

type ValidationError = {
  message: string;
  nodeId?: string;
  edgeId?: string;
};

type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

export function validateGraph(nodes: NodeModel[], edges: EdgeModel[]): ValidationError[] {
  const errors: ValidationError[] = [];

  const startNodes = nodes.filter(n => n.type === "start");
  const endNodes = nodes.filter(n => n.type === "end");

  if (startNodes.length !== 1) {
    errors.push({
      message: "Workflow must contain exactly one start node",
    });
  }

  if (endNodes.length === 0) {
    errors.push({
      message: "Workflow must contain at least one end node",
    });
  }

  return errors;
}

export function validateWorkflow(
  nodes: NodeModel[],
  edges: EdgeModel[]
): ValidationResult {
  const errors = [
    ...validateGraph(nodes, edges),
  ];

  return {
    valid: errors.length === 0,
    errors,
  };
}
