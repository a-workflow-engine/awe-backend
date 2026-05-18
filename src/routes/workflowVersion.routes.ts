import { Router } from "express";
import { workflowVersionController } from "../controllers/workflowVersion.controller.js";
import {
  allowActorTypes,
  allowEnvironmentType,
} from "../middlewares/allowTypes.middleware.js";
import { ActorTypes, EnvironmentTypes } from "../types/enums.js";
import { authenticateRequest } from "../middlewares/auth.middleware.js";

export const versionRouter = Router();

versionRouter.use(authenticateRequest);

versionRouter.get("/", workflowVersionController.list);

versionRouter.get("/:versionId", workflowVersionController.get);

versionRouter.post("/:versionId/activate", workflowVersionController.activate);

versionRouter.post(
  "/:versionId/deactivate",
  workflowVersionController.deactivate,
);

versionRouter.post(
  "/:versionId/clone",
  allowEnvironmentType(EnvironmentTypes.DEVELOPMENT),
  workflowVersionController.clone,
);

versionRouter.post(
  "/:versionId/promote",
  allowActorTypes(ActorTypes.ORGANIZATION_ACCOUNT),
  workflowVersionController.promote,
);
