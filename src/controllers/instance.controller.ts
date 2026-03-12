import type { Request, Response } from "express";
import { instanceService } from "../services/instance.service.js";

export const startInstance = async (req: Request, res: Response) => {
  const { workflowId, context = {}, autoAdvance = true } = req.body;

    // if (!workflowId) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "workflowId is required",
    //   });
    // }

    const instance = await instanceService.startInstance(
      workflowId,
      context,
      autoAdvance,
      req.actor
    );

    return res.status(201).json({
      success: true,
      data: { instance },
    });
//   } catch (error: any) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
};