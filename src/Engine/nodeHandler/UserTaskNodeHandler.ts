import { v4 as uuidv4 } from "uuid";
import type {
  WorkflowContext,
  WorkflowNode,
  ExecutionResult,
  UserTask,
} from "../../types/workflow.type.js";
import { taskService } from "../../services/taskStore.js";

/*
 Handles USER_TASK nodes
 Pauses execution and creates a task for user input
 */
export async function handleUserTaskNode(
  context: Record<string, any>,
  node: WorkflowNode
): Promise<ExecutionResult> {
  const taskId = uuidv4();

  const formFields = node.config?.formFields || [];

  const task: UserTask = {
    taskId,
    executionId: context.executionId,
    nodeId: node.id,
    status: "PENDING",
    formFields,
    createdAt: new Date(),  
  };

  // Persist task in database
  await taskService.createTask(task);

  // Pause workflow execution
  context.status = "WAITING_FOR_USER_INPUT";
  context.currentNodeId = node.id;

  return {
    executionStatus: "WAITING_FOR_USER_INPUT",
    nodeId: node.id,
    taskId,
    message: `User input required: ${node.name}`,
  };
}