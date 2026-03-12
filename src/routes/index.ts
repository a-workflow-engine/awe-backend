import { Router } from "express";
import { systemRouter } from "./system.routes.js";
import { authRouter } from "./auth.routes.js";
import { workflowRouter } from "./workflow.routes.js"
import { startInstance } from "../controllers/instance.controller.js"
import { taskRouter } from "./task.routes.js"
import { auditRouter } from "./audit.routes.js"
export const router = Router();

router.use("/api/v1", 
    router
    .use("/systems", systemRouter)
    .use("/auth", authRouter)
    .use("/workflows", workflowRouter)
    .use("/instances",startInstance)
    .use("/task", taskRouter)
    .use("/audit", auditRouter)
);
