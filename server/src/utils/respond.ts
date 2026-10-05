import { Response } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  options: { status?: number; message?: string; meta?: Record<string, unknown> } = {},
): Response => {
  const body: ApiResponse<T> = { success: true, data };
  if (options.message) body.message = options.message;
  if (options.meta) body.meta = options.meta;

  return res.status(options.status ?? 200).json(body);
};

export const sendError = (
  res: Response,
  status: number,
  message: string,
  details?: unknown,
): Response => res.status(status).json({ success: false, message, details });