import { Router } from "express";
import { organizationRouter } from "./organization.routes.js";
import { authRouter } from "./auth.routes.js";
import { workflowRouter } from "./workflow.routes.js";
import { instanceRouter } from "./instance.routes.js";
import { taskRouter } from "./task.routes.js";
import { userTaskRouter } from "./usertask.routes.js";
import { auditRouter } from "./audit.routes.js";
import { secretRouter } from "./secret.routes.js";
import { secretProviderRouter } from "./secretProvider.routes.js";
import { apiKeyRouter } from "./apiKey.routes.js";
import { draftRouter } from "./workflowDraft.routes.js";

const apiRouter = Router();

apiRouter.use("/", organizationRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/workflows", workflowRouter);
apiRouter.use("/workflow-drafts", draftRouter);
apiRouter.use("/instances", instanceRouter);
apiRouter.use("/tasks", taskRouter);
apiRouter.use("/user-tasks", userTaskRouter);
apiRouter.use("/audit", auditRouter);
apiRouter.use("/api-keys", apiKeyRouter);
apiRouter.use("/secrets", secretRouter);
apiRouter.use("/secret-providers", secretProviderRouter);

export const router = Router();

router.use("/v1", apiRouter);
