import type {
  WorkflowContext,
  WorkflowNode,
  ExecutionResult,
} from "../types/workflow.type";
import { handleUserTaskNode } from "./nodeHandler/UserTaskNodeHandler.js";

// Core workflow execution engine
class ExecutionEngine {
  //Execute next node
  async executeNext(
    context: Record<string, any>,
    nodeId: string
  ): Promise<ExecutionResult> {
    const node = this.getNode(nodeId);

    switch (node.type) {
      case "USER_TASK":
        return handleUserTaskNode(context, node);

      default:
        return {
          executionStatus: "COMPLETED",
          nodeId: node.id,
          message: "Workflow completed",
        };
    }
  }

  /*
    Fetch node configuration
    In real system this comes from DB
   */
  getNode(nodeId: string): WorkflowNode {
    return {
      id: "node_3",
      type: "USER_TASK",
      name: "Approve Request",
      config: {
        formFields: [
          { name: "approval", type: "boolean" },
          { name: "comment", type: "text" },
        ],
      },
    };
  }
}

export const executionEngine = new ExecutionEngine();