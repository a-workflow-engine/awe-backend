import type { NextFunction, Request, Response } from "express";
import type { ActorType, EnvironmentType } from "../types/database.js";
import { AuthError } from "../errors/AuthError.js";
import { environmentUtils } from "../utils/environment.utils.js";

export const allowActorTypes =
  (...allowedActors: ActorType[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const isAuthorized = allowedActors.includes(req.context.actor.type);

    if (!isAuthorized) {
      throw new AuthError("Forbidden", 403);
    }

    next();
  };

export const allowEnvironmentType =
  (allowedEnvironmentType: EnvironmentType) =>
  (req: Request, res: Response, next: NextFunction) => {
    // check if actor has access to this environment
    environmentUtils.getSelectedEnvironmentOrThrow(
      req.context.environments,
      allowedEnvironmentType,
    );

    next();
  };
