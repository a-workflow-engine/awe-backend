import { Router } from "express";
import { auditController } from "../controllers/audit.controller.js";
export const auditRouter = Router();

auditRouter.get("/", auditController.getLogsByInstanceId);
