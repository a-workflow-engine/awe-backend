import type { Request, Response } from "express";
import { workflowVersionService } from "../services/workflowVersion.service.js";
import {
  WorkflowVersionDetailRequest,
  WorkflowVersionUpdateStatusRequest,
  WorkflowVersionValidateRequest,
} from "../schemas/workflowVersion.schema.js";

export const workflowVersionController = {
  create: async (req: Request, res: Response) => {
    const workflowVersion = await workflowVersionService.createNew(
      { ...req.body, workflowId: req.params.workflowId },
      req.actor,
    );

    return res.status(201).json({
      id: workflowVersion.id,
      workflowId: workflowVersion.workflow_id,
      versionNumber: workflowVersion.version,
      status: workflowVersion.status,
      createdAt: workflowVersion.created_on,
    });
  },

  validate: async (req: Request, res: Response) => {
    const data = WorkflowVersionValidateRequest.parse({
      ...req.params,
      actor: req.actor,
    });

    const { result, workflowVersion } =
      await workflowVersionService.validate(data);

    res.status(200).json({
      valid: result.valid,
      errors: result.errors,
      versionId: workflowVersion.id,
      versionNumber: workflowVersion.version,
      status: workflowVersion.status,
    });
  },

  get: async (req: Request, res: Response) => {
    const data = WorkflowVersionDetailRequest.parse({
      ...req.params,
      actor: req.actor,
    });

    const { workflowVersion, nodes, edges } =
      await workflowVersionService.getDetail(data);

    return res.status(200).json({
      id: workflowVersion.id,
      workflowId: workflowVersion.workflow_id,
      versionNumber: workflowVersion.version,
      status: workflowVersion.status,
      publishedAt: "2025-01-15T10:30:00.000Z",
      createdAt: workflowVersion.created_on,
      modifiedAt: workflowVersion.modified_on,
      nodes,
      edges,
    });
  },

  updateStatus: async (req: Request, res: Response) => {
    const data = WorkflowVersionUpdateStatusRequest.parse({
      ...req.params,
      ...req.body,
      actor: req.actor,
    });

    const workflowVersion = await workflowVersionService.changeStatus(data);

    res.status(200).json({
      version: {
        id: workflowVersion.id,
        versionNumber: workflowVersion.version,
        status: workflowVersion.status,
        publishedAt: workflowVersion.published_on,
      },
    });
  },
};
