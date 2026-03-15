import { taskService } from "../../src/services/task.service.js";
import { taskRepository } from "../../src/repositories/task.repository.js";
import { RepositoryError } from "../../src/errors/RepositoryError.js";
import type { TaskModel } from "../../src/types/models.js";

jest.mock("../../src/repositories/task.repository.js");

const mockTask: TaskModel = {
  id: "task-uuid-1",
  instance_id: "inst-1",
  node_id: "node-1",
  status: "completed",
  created_on: new Date(),
};

describe("taskService", () => {
  describe("getTask()", () => {
    it("returns the task when repository resolves with a task", async () => {
      jest.mocked(taskRepository.findById).mockResolvedValueOnce(mockTask);
      const result = await taskService.getTask("task-uuid-1");
      expect(result).toEqual(mockTask);
    });

    it("returns undefined when repository resolves with undefined", async () => {
      jest.mocked(taskRepository.findById).mockResolvedValueOnce(undefined);
      const result = await taskService.getTask("task-uuid-1");
      expect(result).toBeUndefined();
    });

    it("propagates RepositoryError thrown by the repository", async () => {
      jest
        .mocked(taskRepository.findById)
        .mockRejectedValueOnce(new RepositoryError("db error", new Error("connection failed")));
      await expect(taskService.getTask("task-uuid-1")).rejects.toThrow(RepositoryError);
    });
  });
});
