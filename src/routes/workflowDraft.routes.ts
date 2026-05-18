import { Router } from "express";
import { allowEnvironmentType } from "../middlewares/allowTypes.middleware.js";
import { EnvironmentTypes } from "../types/enums.js";
import { workflowDraftController } from "../controllers/workflowDraft.controller.js";
import { authenticateRequest } from "../middlewares/auth.middleware.js";

export const draftRouter = Router();

draftRouter.use(authenticateRequest);
draftRouter.use(allowEnvironmentType(EnvironmentTypes.DEVELOPMENT));

draftRouter.get("/", workflowDraftController.list);

draftRouter.post("/", workflowDraftController.create);

draftRouter.get("/:draftId", workflowDraftController.get);

draftRouter.patch("/:draftId", workflowDraftController.update);

draftRouter.post("/:draftId/validate", workflowDraftController.validate);

draftRouter.delete("/:draftId", workflowDraftController.delete);

draftRouter.post("/:draftId/publish", workflowDraftController.publish);

draftRouter.post("/:draftId/clone", workflowDraftController.clone);
