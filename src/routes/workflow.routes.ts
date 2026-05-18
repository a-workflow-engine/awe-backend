import { Router } from "express";
import { workflowController } from "../controllers/workflow.controller.js";
import { authenticateRequest } from "../middlewares/auth.middleware.js";
import { allowActorTypes } from "../middlewares/allowTypes.middleware.js";
import { ActorTypes } from "../types/enums.js";

export const workflowRouter = Router();

workflowRouter.use(authenticateRequest);

workflowRouter.get("/", workflowController.list);

workflowRouter.post(
  "/",
  allowActorTypes(ActorTypes.ORGANIZATION_ACCOUNT),
  workflowController.create,
);

workflowRouter.get("/:workflowId", workflowController.get);

workflowRouter.patch(
  "/:workflowId",
  allowActorTypes(ActorTypes.ORGANIZATION_ACCOUNT),
  workflowController.update,
);

workflowRouter.delete(
  "/:workflowId",
  allowActorTypes(ActorTypes.ORGANIZATION_ACCOUNT),
  workflowController.delete,
);

workflowRouter.post("/validate", workflowController.validate);
