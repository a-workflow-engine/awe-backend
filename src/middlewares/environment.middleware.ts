import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { environmentService } from "../services/environment.services.js";
import { ValidationError } from "../errors/ValidationError.js";
import type { EnvironmentType } from "../types/database.js";
import { parseEnvironmentTypesFromQuery } from "../utils/environment.utils.js";

declare global {
  namespace Express {
    interface Request {
      environmentId: string;
      environmentIds: string[];
      environmentType: EnvironmentType;
      environmentTypes: EnvironmentType[];
    }
  }
}

export const resolveEnvironmentContext = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const environmentTypes = parseEnvironmentTypesFromQuery(
    req.query.environmentType,
  );

  const environments = environmentTypes.length > 0
    ? await environmentService.getByActorAndTypes(req.actor, environmentTypes)
    : await environmentService.getAllByActor(req.actor);

  if (environmentTypes.length > 0 && environments.length === 0) {
    throw new ValidationError("Invalid environmentType for this actor", [
      {
        field: "environmentType",
        message: `Environment ${environmentTypes.join(", ")} is not available for this actor`,
      },
    ]);
  }

  if (environments.length === 0) {
    throw new ValidationError("No environments available for this actor", [
      {
        field: "environmentType",
        message: "At least one environment is required",
      },
    ]);
  }

  req.environmentIds = environments.map((environment) => environment.id);
  req.environmentTypes = environments.map((environment) => environment.type);

  const primaryEnvironmentId = req.environmentIds[0];
  const primaryEnvironmentType = req.environmentTypes[0];

  if (!primaryEnvironmentId || !primaryEnvironmentType) {
    throw new ValidationError("No environments available for this actor", [
      {
        field: "environmentType",
        message: "At least one environment is required",
      },
    ]);
  }

  req.environmentId = primaryEnvironmentId;
  req.environmentType = primaryEnvironmentType;
  return next();
};
