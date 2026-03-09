import type { Request, Response } from "express";
import { workflowVersionService } from "../services/workflowVersion.service.js";

export const workflowVersionController = {
  createVersion: async (req: Request, res: Response) => {
    const workflowVersion = await workflowVersionService.createNew(
      req.body,
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

  validateVersion: (req: Request, res: Response) => {
    res.status(200).json({
      valid: true,
      errors: [],
      versionId: "ver-uuid",
      versionNumber: 2,
    });
  },

  listVersions: (req: Request, res: Response) => {
    res.status(200).json({
      versions: [
        {
          id: "ver-uuid-1",
          versionNumber: 1,
          status: "deprecated",
          publishedAt: "2025-01-10T08:00:00.000Z",
          createdAt: "2025-01-09T10:00:00.000Z",
        },
        {
          id: "ver-uuid-2",
          versionNumber: 2,
          status: "active",
          publishedAt: "2025-01-15T10:30:00.000Z",
          createdAt: "2025-01-14T09:00:00.000Z",
        },
      ],
      pagination: { total: 5, page: 1, limit: 20, totalPages: 1 },
    });
  },

  getVersion: (req: Request, res: Response) => {
    res.status(200).json({
      id: "ver-uuid",
      workflowId: "wf-uuid",
      versionNumber: 2,
      status: "active",
      nodes: [
        {
          id: "node-db-uuid",
          nodeId: "start_1",
          type: "start",
          label: "Start",
          config: {},
          position: { x: 100, y: 100 },
        },
        {
          id: "node-db-uuid",
          nodeId: "task_1",
          type: "user_task",
          label: "userTask",
          config: {},
          position: { x: 100, y: 200 },
        },
      ],
      edges: [
        {
          id: "edge-db-uuid",
          edgeId: "e1",
          sourceNodeId: "start_1",
          targetNodeId: "task_1",
          conditionExpression: null,
          isDefault: false,
        },
      ],
      publishedAt: "2025-01-15T10:30:00.000Z",
      createdAt: "2025-01-14T09:00:00.000Z",
    });
  },

  publishVersion: (req: Request, res: Response) => {
    res.status(200).json({
      message: "Version published and set as active.",
      version: {
        id: "ver-uuid",
        versionNumber: 2,
        status: "active",
        publishedAt: "2025-01-15T10:30:00.000Z",
      },
    });
  },
};
