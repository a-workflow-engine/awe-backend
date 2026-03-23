export class EngineError extends Error {
  public readonly isOperational = true;
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;

    Error.captureStackTrace(this, this.constructor);
  }
}
