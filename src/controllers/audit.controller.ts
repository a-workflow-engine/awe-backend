import type { Request, Response } from "express";
import { eventLogService } from "../services/eventLog.service";
import z from "zod";
import type { InstanceEntityType, InstanceEventType } from "../types/database";

const auditControllerSchema = z.object({
    instanceId: z.string().uuid()
});

export const auditController = {
    getLogsByInstanceId: async (req: Request, res: Response): Promise<void> => {
        const { instanceId } = auditControllerSchema.parse(req.params);
        const { entityTypes, createdBy, eventTypes, sortOrder } = req.query;
        const filters = {
            entityTypes: entityTypes
                ? (typeof entityTypes === "string"
                    ? entityTypes.replace(/\s/g, "").split(",")
                    : entityTypes) as InstanceEntityType[]
                : undefined,

            createdBy: createdBy as string | undefined,

            eventTypes: eventTypes
                ? (typeof eventTypes === "string"
                    ? eventTypes.replace(/\s/g, "").split(",")
                    : eventTypes) as InstanceEventType[]
                : undefined,
        };
        console.log("Filters:", filters, "Sort Order:", sortOrder);
        const logs = await eventLogService.getLogsByInstanceId(instanceId, filters, sortOrder as "asc" | "desc");
        res.json(logs);
    },

}   