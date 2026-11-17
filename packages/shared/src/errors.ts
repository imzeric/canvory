export type ErrorCode =
  | "SIZE_MISMATCH"
  | "SCHEMA_UNSUPPORTED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "TASK_NOT_DOWNLOADABLE"
  | "NOT_FOUND"
  | "VALIDATION_ERROR";

export class CanvoryError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = "CanvoryError";
  }
}
