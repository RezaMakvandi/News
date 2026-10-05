/** Error carrying an HTTP status code, thrown from controllers/services. */
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'درخواست نامعتبر است', details?: unknown) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'برای انجام این کار باید وارد شوید') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'شما به این بخش دسترسی ندارید') {
    return new ApiError(403, message);
  }

  static notFound(message = 'موردی یافت نشد') {
    return new ApiError(404, message);
  }

  static conflict(message = 'این مورد از قبل وجود دارد') {
    return new ApiError(409, message);
  }
}

/** Wraps async route handlers so rejected promises reach the error middleware. */
export const asyncHandler =
  <T extends (...args: any[]) => Promise<unknown>>(handler: T) =>
  (req: any, res: any, next: any) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };