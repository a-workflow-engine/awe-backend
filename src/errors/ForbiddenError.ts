import { AppError } from "./AppError.js";

export class ForbiddenError extends AppError {
  constructor(
    message: string = "Not authorized to perform this operation",
    statusCode = 403,
    cause?: unknown,
  ) {
    super(message, statusCode, cause);
  }
}
