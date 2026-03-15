import { instanceRepository } from "../../src/repositories/instance.repository.js";
import { taskRepository } from "../../src/repositories/task.repository.js";
import { taskExecutionRepository } from "../../src/repositories/taskExecution.repository.js";
import { nodeRepository } from "../../src/repositories/node.repository.js";
import { edgeRepository } from "../../src/repositories/edge.repository.js";
import { nodeService } from "../../src/services/node.services.js";
import { StartNodeExecutor } from "../../src/engine/executors/StartNodeExecutor.js";
import { EndNodeExecutor } from "../../src/engine/executors/EndNodeExecutor.js";
import { executionEngine } from "../../src/engine/ExecutionEngine.js";
import { TaskStatuses, InstanceStatuses, NodeTypes } from "../../src/types/enums.js";
import { StateTransitionError } from "../../src/errors/StateTransitionError.js";
import type { NodeModel, EdgeModel, InstanceModel, TaskModel } from "../../src/types/models.js";

jest.mock("../../src/repositories/instance.repository.js");
jest.mock("../../src/repositories/task.repository.js");
jest.mock("../../src/repositories/taskExecution.repository.js");
jest.mock("../../src/repositories/node.repository.js");
jest.mock("../../src/repositories/edge.repository.js");
jest.mock("../../src/services/node.services.js");
jest.mock("../../src/engine/executors/StartNodeExecutor.js", () => ({
  StartNodeExecutor: jest.fn().mockImplementation(function (this: any) {
    this.execute = jest.fn();
  }),
}));
jest.mock("../../src/engine/executors/EndNodeExecutor.js", () => ({
  EndNodeExecutor: jest.fn().mockImplementation(function (this: any) {
    this.execute = jest.fn();
  }),
}));

const tx = {} as any;

const mockInstance: InstanceModel = {
  id: "inst-1",
  workflow_version_id: "wfv-1",
  status: "in_progress",
  input_variables: { amount: 500 },
  output_variables: null,
  current_variables: null,
  started_on: new Date(),
  ended_on: null,
  created_by: "actor-1",
  created_on: new Date(),
};

const baseNodeProps = {
  client_id: "client-n",
  workflow_version_id: "wfv-1",
  configuration: {},
  max_attempts: 1,
  name: null,
  description: null,
  input_schema: null,
  output_schema: null,
  x_coordinate: null,
  y_coordinate: null,
  is_deleted: false,
  created_by: "actor-1",
  modified_by: "actor-1",
  created_on: new Date(),
  modified_on: new Date(),
  deleted_by: null,
  deleted_on: null,
};

const startNode: NodeModel = { ...baseNodeProps, id: "node-start", client_id: "client-start", type: NodeTypes.START };
const endNode: NodeModel = { ...baseNodeProps, id: "node-end", client_id: "client-end", type: NodeTypes.END };
const userNode: NodeModel = { ...baseNodeProps, id: "node-user", client_id: "client-user", type: "user" };

const baseEdgeProps = {
  name: null,
  is_deleted: false,
  created_by: "actor-1",
  modified_by: "actor-1",
  created_on: new Date(),
  modified_on: new Date(),
  deleted_by: null,
  deleted_on: null,
};

const edgeStartToEnd: EdgeModel = {
  ...baseEdgeProps,
  id: "edge-1",
  client_id: "client-edge-1",
  source_node_id: "node-start",
  destination_node_id: "node-end",
  condition_expression: null,
};

const edgeStartToUser: EdgeModel = {
  ...baseEdgeProps,
  id: "edge-2",
  client_id: "client-edge-2",
  source_node_id: "node-start",
  destination_node_id: "node-user",
  condition_expression: null,
};

const mockTask1: TaskModel = { id: "task-1", instance_id: "inst-1", node_id: "node-start", status: "in_progress", created_on: new Date() };
const mockTask2: TaskModel = { id: "task-2", instance_id: "inst-1", node_id: "node-end", status: "in_progress", created_on: new Date() };
const mockInstanceWithVars: InstanceModel = { ...mockInstance, current_variables: { global: { amount: 500 }, next: {} } };
const mockCompletedInstance: InstanceModel = { ...mockInstance, status: "completed" };
const mockFailedInstance: InstanceModel = { ...mockInstance, status: "failed" };

const completedStartResult = {
  status: TaskStatuses.COMPLETED,
  outputVariables: { constants: { amount: 500 }, fetchables: {}, urls: {} },
};

const completedEndResult = {
  status: TaskStatuses.COMPLETED,
  outputVariables: { result: 500 },
};

let startExecMock: jest.Mock;
let endExecMock: jest.Mock;

beforeAll(() => {
  startExecMock = (jest.mocked(StartNodeExecutor).mock.instances[0] as any).execute;
  endExecMock = (jest.mocked(EndNodeExecutor).mock.instances[0] as any).execute;
});

describe("ExecutionEngine", () => {
  describe("start()", () => {
    it("happy path: start node COMPLETED, end node COMPLETED → instance status becomes completed", async () => {
      jest.mocked(nodeService.getByStartNodeByWorkflowVersionIdOrThrow).mockResolvedValueOnce(startNode);
      jest.mocked(taskRepository.insert).mockResolvedValueOnce(mockTask1).mockResolvedValueOnce(mockTask2);
      startExecMock.mockResolvedValueOnce(completedStartResult);
      jest.mocked(instanceRepository.updateById).mockResolvedValueOnce(mockInstanceWithVars).mockResolvedValueOnce(mockCompletedInstance);
      jest.mocked(nodeRepository.findByWorkflowVersionId).mockResolvedValueOnce([startNode, endNode]);
      jest.mocked(edgeRepository.findByNodeIds).mockResolvedValueOnce([edgeStartToEnd]);
      endExecMock.mockResolvedValueOnce(completedEndResult);

      const result = await executionEngine.start(mockInstance, tx);
      expect(result.status).toBe(InstanceStatuses.COMPLETED);
    });

    it("nodeService throws → error propagates out of start()", async () => {
      jest
        .mocked(nodeService.getByStartNodeByWorkflowVersionIdOrThrow)
        .mockRejectedValueOnce(new Error("start node not found"));
      await expect(executionEngine.start(mockInstance, tx)).rejects.toThrow("start node not found");
    });

    it("StartNodeExecutor returns FAILED → instanceRepository.updateById called with status failed", async () => {
      jest.mocked(nodeService.getByStartNodeByWorkflowVersionIdOrThrow).mockResolvedValueOnce(startNode);
      jest.mocked(taskRepository.insert).mockResolvedValueOnce(mockTask1);
      startExecMock.mockResolvedValueOnce({ status: TaskStatuses.FAILED, outputVariables: {}, error: "executor failed" });
      jest.mocked(instanceRepository.updateById).mockResolvedValueOnce(mockFailedInstance);

      const result = await executionEngine.start(mockInstance, tx);
      expect(result.status).toBe(InstanceStatuses.FAILED);
      expect(jest.mocked(instanceRepository.updateById)).toHaveBeenCalledWith(
        mockInstance.id,
        expect.objectContaining({ status: InstanceStatuses.FAILED }),
        tx,
      );
    });

    it("StartNodeExecutor throws → treated as FAILED, instanceRepository.updateById called with failed", async () => {
      jest.mocked(nodeService.getByStartNodeByWorkflowVersionIdOrThrow).mockResolvedValueOnce(startNode);
      jest.mocked(taskRepository.insert).mockResolvedValueOnce(mockTask1);
      startExecMock.mockRejectedValueOnce(new Error("unexpected crash"));
      jest.mocked(instanceRepository.updateById).mockResolvedValueOnce(mockFailedInstance);

      const result = await executionEngine.start(mockInstance, tx);
      expect(result.status).toBe(InstanceStatuses.FAILED);
    });

    it("no outgoing edges from start node → instance marked FAILED", async () => {
      jest.mocked(nodeService.getByStartNodeByWorkflowVersionIdOrThrow).mockResolvedValueOnce(startNode);
      jest.mocked(taskRepository.insert).mockResolvedValueOnce(mockTask1);
      startExecMock.mockResolvedValueOnce(completedStartResult);
      jest.mocked(instanceRepository.updateById)
        .mockResolvedValueOnce(mockInstanceWithVars)
        .mockResolvedValueOnce(mockFailedInstance);
      jest.mocked(nodeRepository.findByWorkflowVersionId).mockResolvedValueOnce([startNode]);
      jest.mocked(edgeRepository.findByNodeIds).mockResolvedValueOnce([]);

      const result = await executionEngine.start(mockInstance, tx);
      expect(result.status).toBe(InstanceStatuses.FAILED);
    });

    it("EndNodeExecutor returns FAILED → instanceRepository.updateById called with status failed", async () => {
      jest.mocked(nodeService.getByStartNodeByWorkflowVersionIdOrThrow).mockResolvedValueOnce(startNode);
      jest.mocked(taskRepository.insert).mockResolvedValueOnce(mockTask1).mockResolvedValueOnce(mockTask2);
      startExecMock.mockResolvedValueOnce(completedStartResult);
      jest.mocked(instanceRepository.updateById).mockResolvedValueOnce(mockInstanceWithVars).mockResolvedValueOnce(mockFailedInstance);
      jest.mocked(nodeRepository.findByWorkflowVersionId).mockResolvedValueOnce([startNode, endNode]);
      jest.mocked(edgeRepository.findByNodeIds).mockResolvedValueOnce([edgeStartToEnd]);
      endExecMock.mockResolvedValueOnce({ status: TaskStatuses.FAILED, outputVariables: {}, error: "end failed" });

      const result = await executionEngine.start(mockInstance, tx);
      expect(result.status).toBe(InstanceStatuses.FAILED);
    });

    it("EndNodeExecutor returns COMPLETED → instanceRepository.updateById called with status completed", async () => {
      jest.mocked(nodeService.getByStartNodeByWorkflowVersionIdOrThrow).mockResolvedValueOnce(startNode);
      jest.mocked(taskRepository.insert).mockResolvedValueOnce(mockTask1).mockResolvedValueOnce(mockTask2);
      startExecMock.mockResolvedValueOnce(completedStartResult);
      jest.mocked(instanceRepository.updateById).mockResolvedValueOnce(mockInstanceWithVars).mockResolvedValueOnce(mockCompletedInstance);
      jest.mocked(nodeRepository.findByWorkflowVersionId).mockResolvedValueOnce([startNode, endNode]);
      jest.mocked(edgeRepository.findByNodeIds).mockResolvedValueOnce([edgeStartToEnd]);
      endExecMock.mockResolvedValueOnce(completedEndResult);

      await executionEngine.start(mockInstance, tx);
      expect(jest.mocked(instanceRepository.updateById)).toHaveBeenCalledWith(
        mockInstance.id,
        expect.objectContaining({ status: InstanceStatuses.COMPLETED }),
        tx,
      );
    });

    it("next node has no registered executor → StateTransitionError propagates", async () => {
      jest.mocked(nodeService.getByStartNodeByWorkflowVersionIdOrThrow).mockResolvedValueOnce(startNode);
      jest.mocked(taskRepository.insert).mockResolvedValueOnce(mockTask1);
      startExecMock.mockResolvedValueOnce(completedStartResult);
      jest.mocked(instanceRepository.updateById).mockResolvedValueOnce(mockInstanceWithVars);
      jest.mocked(nodeRepository.findByWorkflowVersionId).mockResolvedValueOnce([startNode, userNode]);
      jest.mocked(edgeRepository.findByNodeIds).mockResolvedValueOnce([edgeStartToUser]);

      await expect(executionEngine.start(mockInstance, tx)).rejects.toThrow(StateTransitionError);
    });

    it("edgeResolver throws StateTransitionError (broken decision) → instance marked FAILED", async () => {
      const decisionAliasNode: NodeModel = {
        ...baseNodeProps,
        id: "node-start",
        client_id: "client-start",
        type: NodeTypes.DECISION,
      };
      const conditionalEdge: EdgeModel = {
        ...baseEdgeProps,
        id: "edge-cond",
        client_id: "client-edge-cond",
        source_node_id: "node-start",
        destination_node_id: "node-end",
        condition_expression: "unmatchableValue > 99999",
      };

      jest.mocked(nodeService.getByStartNodeByWorkflowVersionIdOrThrow).mockResolvedValueOnce(startNode);
      jest.mocked(taskRepository.insert).mockResolvedValueOnce(mockTask1);
      startExecMock.mockResolvedValueOnce({
        status: TaskStatuses.COMPLETED,
        outputVariables: { constants: {}, fetchables: {}, urls: {} },
      });
      jest.mocked(instanceRepository.updateById).mockResolvedValueOnce(mockInstanceWithVars).mockResolvedValueOnce(mockFailedInstance);
      jest.mocked(nodeRepository.findByWorkflowVersionId).mockResolvedValueOnce([decisionAliasNode]);
      jest.mocked(edgeRepository.findByNodeIds).mockResolvedValueOnce([conditionalEdge]);

      const result = await executionEngine.start(mockInstance, tx);
      expect(result.status).toBe(InstanceStatuses.FAILED);
    });

    it("taskRepository.insert is called once for start node and once for end node", async () => {
      jest.mocked(nodeService.getByStartNodeByWorkflowVersionIdOrThrow).mockResolvedValueOnce(startNode);
      jest.mocked(taskRepository.insert).mockResolvedValueOnce(mockTask1).mockResolvedValueOnce(mockTask2);
      startExecMock.mockResolvedValueOnce(completedStartResult);
      jest.mocked(instanceRepository.updateById).mockResolvedValueOnce(mockInstanceWithVars).mockResolvedValueOnce(mockCompletedInstance);
      jest.mocked(nodeRepository.findByWorkflowVersionId).mockResolvedValueOnce([startNode, endNode]);
      jest.mocked(edgeRepository.findByNodeIds).mockResolvedValueOnce([edgeStartToEnd]);
      endExecMock.mockResolvedValueOnce(completedEndResult);

      await executionEngine.start(mockInstance, tx);
      expect(jest.mocked(taskRepository.insert)).toHaveBeenCalledTimes(2);
    });

    it("taskExecutionRepository.insert is called twice (once per node)", async () => {
      jest.mocked(nodeService.getByStartNodeByWorkflowVersionIdOrThrow).mockResolvedValueOnce(startNode);
      jest.mocked(taskRepository.insert).mockResolvedValueOnce(mockTask1).mockResolvedValueOnce(mockTask2);
      startExecMock.mockResolvedValueOnce(completedStartResult);
      jest.mocked(instanceRepository.updateById).mockResolvedValueOnce(mockInstanceWithVars).mockResolvedValueOnce(mockCompletedInstance);
      jest.mocked(nodeRepository.findByWorkflowVersionId).mockResolvedValueOnce([startNode, endNode]);
      jest.mocked(edgeRepository.findByNodeIds).mockResolvedValueOnce([edgeStartToEnd]);
      endExecMock.mockResolvedValueOnce(completedEndResult);

      await executionEngine.start(mockInstance, tx);
      expect(jest.mocked(taskExecutionRepository.insert)).toHaveBeenCalledTimes(2);
    });

    it("constants from start node output are merged into current_variables before advancing", async () => {
      jest.mocked(nodeService.getByStartNodeByWorkflowVersionIdOrThrow).mockResolvedValueOnce(startNode);
      jest.mocked(taskRepository.insert).mockResolvedValueOnce(mockTask1).mockResolvedValueOnce(mockTask2);
      startExecMock.mockResolvedValueOnce(completedStartResult);
      jest.mocked(instanceRepository.updateById).mockResolvedValueOnce(mockInstanceWithVars).mockResolvedValueOnce(mockCompletedInstance);
      jest.mocked(nodeRepository.findByWorkflowVersionId).mockResolvedValueOnce([startNode, endNode]);
      jest.mocked(edgeRepository.findByNodeIds).mockResolvedValueOnce([edgeStartToEnd]);
      endExecMock.mockResolvedValueOnce(completedEndResult);

      await executionEngine.start(mockInstance, tx);
      expect(jest.mocked(instanceRepository.updateById)).toHaveBeenCalledWith(
        mockInstance.id,
        expect.objectContaining({
          current_variables: { global: { amount: 500 }, next: {} },
        }),
        tx,
      );
    });
  });
});
