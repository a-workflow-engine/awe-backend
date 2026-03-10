import { Router } from "express";
import { systemController } from "../controllers/system.controller.js";
import { authenticateRequest } from "../middlewares/auth.middleware.js";
import { apiKeyController } from "../controllers/apiKey.controller.js";

export const systemRouter = Router();

systemRouter.post("/register", systemController.register);

systemRouter.get("/api-keys", authenticateRequest, apiKeyController.list);
systemRouter.post("/api-keys", authenticateRequest, apiKeyController.generate);
systemRouter.patch(
  "/api-keys/:keyId/revoke",
  authenticateRequest,
  apiKeyController.revoke,
);

systemRouter.get("/me", authenticateRequest, systemController.me);