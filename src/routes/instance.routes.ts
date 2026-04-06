import { Router } from "express";
import { instanceController } from "../controllers/instance.controller.js";
import { authenticateRequest } from "../middlewares/auth.middleware.js";

export const instanceRouter = Router();

instanceRouter.get("/", authenticateRequest, instanceController.list);
instanceRouter.post("/", authenticateRequest, instanceController.create);
instanceRouter.get("/:instanceId", authenticateRequest, instanceController.get);
instanceRouter.get(
  "/:instanceId/executions",
  authenticateRequest,
  instanceController.getExecutionLogs,
);
instanceRouter.post(
  "/:instanceId/resume",
  authenticateRequest,
  instanceController.resume,
);
instanceRouter.post(
  "/:instanceId/pause",
  authenticateRequest,
  instanceController.pause,
);
instanceRouter.post(
  "/:instanceId/terminate",
  authenticateRequest,
  instanceController.terminate,
);
