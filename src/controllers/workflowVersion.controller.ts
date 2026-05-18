import type { Request, Response } from "express";
import { workflowVersionService } from "../services/workflows/workflowVersion.service.js";
import {
  VersionDetailRequestSchema,
  WorkflowVersionIdSchema,
  VersionListRequestSchema,
  WorkflowVersionToggleRequestSchema,
} from "../schemas/workflowVersion.schema.js";

export const workflowVersionController = {
  list: async (req: Request, res: Response) => {
    const data = VersionListRequestSchema.parse(req.query);

    const result = await workflowVersionService.listPaginated(
      data,
      req.context.environments,
    );

    return res.status(200).json(result);
  },

  get: async (req: Request, res: Response) => {
    const data = VersionDetailRequestSchema.parse({
      ...req.params,
      ...req.query,
    });

    const result = await workflowVersionService.getDetail(
      data,
      req.context.environments,
    );

    return res.status(200).json(result);
  },

  activate: async (req: Request, res: Response) => {
    const data = WorkflowVersionToggleRequestSchema.parse({
      ...req.params,
      ...req.body,
    });

    const result = await workflowVersionService.activate(
      data,
      req.context.environments,
    );

    return res.status(200).json(result);
  },

  deactivate: async (req: Request, res: Response) => {
    const data = WorkflowVersionToggleRequestSchema.parse({
      ...req.params,
      ...req.body,
    });

    const result = await workflowVersionService.deactivate(
      data,
      req.context.environments,
    );

    return res.status(200).json(result);
  },

  clone: async (req: Request, res: Response) => {
    const { versionId } = WorkflowVersionIdSchema.parse(req.params);

    const result = await workflowVersionService.clone(
      versionId,
      req.context.actor,
      req.context.environments,
    );

    return res.status(201).json(result);
  },

  promote: async (req: Request, res: Response) => {
    const { versionId } = WorkflowVersionIdSchema.parse(req.params);

    const result = await workflowVersionService.promote(
      versionId,
      req.context.organization,
      req.context.environments,
    );

    return res.status(201).json(result);
  },
};
