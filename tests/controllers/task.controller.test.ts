import { taskController } from "../../src/controllers/task.controller.js";
import { taskService } from "../../src/services/task.service.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";
import { RepositoryError } from "../../src/errors/RepositoryError.js";
import { mockRequest, mockResponse } from "../helpers/mockExpress.js";
import { ZodError } from "zod";
import type { TaskModel } from "../../src/types/models.js";

jest.mock("../../src/services/task.service.js");

const mockTask: TaskModel = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  instance_id: "inst-1",
  node_id: "node-1",
  status: "completed",
  created_on: new Date(),
};

describe("taskController", () => {
  describe("getTask()", () => {
    it("calls res.json with the task when a valid UUID is provided and task is found", async () => {
      jest.mocked(taskService.getTask).mockResolvedValueOnce(mockTask);
      const req = mockRequest({ params: { taskId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" } });
      const res = mockResponse();
      await taskController.getTask(req as any, res as any);
      expect(res.json).toHaveBeenCalledWith({ task: mockTask });
    });

    it("throws NotFoundError when task is not found", async () => {
      jest.mocked(taskService.getTask).mockResolvedValueOnce(undefined);
      const req = mockRequest({ params: { taskId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" } });
      const res = mockResponse();
      await expect(taskController.getTask(req as any, res as any)).rejects.toThrow(NotFoundError);
    });

    it("throws ZodError when taskId is not a valid UUID", async () => {
      const req = mockRequest({ params: { taskId: "not-a-uuid" } });
      const res = mockResponse();
      await expect(taskController.getTask(req as any, res as any)).rejects.toThrow(ZodError);
    });

    it("throws ZodError when taskId param is missing", async () => {
      const req = mockRequest({ params: {} });
      const res = mockResponse();
      await expect(taskController.getTask(req as any, res as any)).rejects.toThrow(ZodError);
    });

    it("propagates RepositoryError thrown by the service", async () => {
      jest
        .mocked(taskService.getTask)
        .mockRejectedValueOnce(new RepositoryError("db error", new Error("connection failed")));
      const req = mockRequest({ params: { taskId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" } });
      const res = mockResponse();
      await expect(taskController.getTask(req as any, res as any)).rejects.toThrow(RepositoryError);
    });
  });
});
