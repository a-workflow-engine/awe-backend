import { AppError } from "./AppError.js";

export type FieldError = {
  field: string;
  message: string;
};

export class ValidationError extends AppError {
  public readonly fieldErrors: FieldError[];

  constructor(message: string, fieldErrors: FieldError[] = []) {
    super(message, 400);
    this.fieldErrors = fieldErrors;
  }
}
