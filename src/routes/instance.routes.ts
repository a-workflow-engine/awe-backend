import { Router } from "express";
import { startInstance } from "../controllers/instance.controller.js";
import { authenticateRequest } from "../middlewares/auth.middleware.js";

export const instanceRouter = Router();
instanceRouter.post("/", authenticateRequest, startInstance);
// instanceRouter.post("/");
