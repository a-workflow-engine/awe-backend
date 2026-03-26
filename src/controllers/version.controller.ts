import type { Request, Response } from "express";
import { workflowVersionService } from "../services/workflowVersion.service.js";
import {
  VersionValidateSchema,
  VersionUpdateStatusSchema,
  VersionUpdateSchema,
} from "../schemas/version.schema.js";
import { WorkflowVersionStatuses } from "../types/enums.js";

export const VersionController = {
  validate: async (req: Request, res: Response) => {
    const data = VersionValidateSchema.parse({
      versionId: req.params.id,
      actor: req.actor,
    });

    const { result, workflowVersion } =
      await workflowVersionService.validateById(data);

    res.status(200).json({
      valid: result.valid,
      errors: result.errors,
      status: workflowVersion.status,
    });
  },

  publish: async (req: Request, res: Response) => {
    const data = VersionUpdateStatusSchema.parse({
      versionId: req.params.id,
      status: WorkflowVersionStatuses.PUBLISHED,
      actor: req.actor,
    });

    const workflowVersion = await workflowVersionService.changeStatusById(data);
    res.status(200).json(workflowVersion);
  },

  activate: async (req: Request, res: Response) => {
    const data = VersionUpdateStatusSchema.parse({
      versionId: req.params.id,
      status: WorkflowVersionStatuses.ACTIVE,
      actor: req.actor,
    });

    const workflowVersion = await workflowVersionService.changeStatusById(data);

    res.status(200).json(workflowVersion);
  },

  deactivate: async (req: Request, res: Response) => {
    const data = VersionUpdateStatusSchema.parse({
      versionId: req.params.id,
      status: WorkflowVersionStatuses.DRAFT,
      actor: req.actor,
    });

    const workflowVersion = await workflowVersionService.changeStatusById(data);

    res.status(200).json(workflowVersion);
  },

  update: async (req: Request, res: Response) => {
    const data = VersionUpdateSchema.parse({
      versionId: req.params.id,
      ...req.body,
      actor: req.actor,
    });

    const workflowVersion = await workflowVersionService.updateById(data);

    res.status(200).json(workflowVersion);
  },
};
