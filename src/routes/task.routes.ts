import { Router } from "express";
import { userTaskController } from "../controllers/usertask.controller.js";
import { authenticateRequest } from "../middlewares/auth.middleware.js";

export const taskRouter = Router();

taskRouter.get("/", authenticateRequest, userTaskController.list);
taskRouter.get("/:taskId", authenticateRequest, userTaskController.getTask);
taskRouter.post(
  "/:taskId/complete",
  authenticateRequest,
  userTaskController.completeUserTask,
);
