import { AppError } from "./AppError.js";

export class DataIntegrityError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, undefined, cause);
  }
}
