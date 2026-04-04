import { AppError } from "./AppError";

export class HttpError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, undefined, cause);
    this.name = "HttpError";
  }
}
