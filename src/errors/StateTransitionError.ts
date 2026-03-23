import { AppError } from "./AppError.js";

export class StateTransitionError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
