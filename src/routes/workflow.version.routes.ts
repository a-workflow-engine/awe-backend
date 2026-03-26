import { Router } from "express";
import { authenticateRequest } from "../middlewares/auth.middleware.js";
import { VersionController } from "../controllers/version.controller.js";

export const versionRouter=Router();
// POST /api/workflow/versions/:id/validate
versionRouter.post(
  "/:id/validate",
  authenticateRequest,
  VersionController.validate
);

// POST /api/workflow/versions/:id/publish
versionRouter.post(
  "/:id/publish",
  authenticateRequest,
  VersionController.publish
);

// POST /api/workflow/versions/:id/activate
versionRouter.post(
  "/:id/activate",
  authenticateRequest,
  VersionController.activate
);

// POST /api/workflow/versions/:id/deactivate
versionRouter.post(
  "/:id/deactivate",
  authenticateRequest,
  VersionController.publish
);

// PATCH /api/workflow/versions/:id
versionRouter.patch(
  "/:id",
  authenticateRequest,
  VersionController.update
);
