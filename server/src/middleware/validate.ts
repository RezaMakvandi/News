import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

type Validator = (value: unknown) => string | null;

export const isEmail: Validator = (value) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
    ? null
    : 'ایمیل وارد شده معتبر نیست';

export const isNonEmpty: Validator = (value) =>
  typeof value === 'string' && value.trim().length > 0 ? null : 'این فیلد الزامی است';

export const minLength =
  (length: number, label = 'این فیلد'): Validator =>
  (value) =>
    typeof value === 'string' && value.trim().length >= length
      ? null
      : `${label} باید حداقل ${length} کاراکتر باشد`;

export const maxLength =
  (length: number, label = 'این فیلد'): Validator =>
  (value) =>
    value === undefined || value === null || String(value).length <= length
      ? null
      : `${label} نباید بیشتر از ${length} کاراکتر باشد`;

export const isBoolean: Validator = (value) =>
  value === undefined || typeof value === 'boolean' ? null : 'مقدار باید بولی باشد';

export const isIn =
  (allowed: string[], label = 'مقدار'): Validator =>
  (value) =>
    value === undefined || allowed.includes(String(value)) ? null : `${label} نامعتبر است`;

/**
 * Validates `req.body` against a map of field → validators.
 * Responds with 422 and per-field messages when something is off.
 */
export const validateBody =
  (schema: Record<string, Validator | Validator[]>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const errors: Record<string, string> = {};

    for (const [field, validators] of Object.entries(schema)) {
      const list = Array.isArray(validators) ? validators : [validators];
      for (const validator of list) {
        const message = validator(req.body?.[field]);
        if (message) {
          errors[field] = message;
          break;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(ApiError.badRequest('اطلاعات ارسالی معتبر نیست', errors));
    }
    return next();
  };

/** Rejects request bodies that carry HTML/script payloads in plain text fields. */
export const rejectMarkup =
  (...fields: string[]): Validator =>
  (value) =>
    typeof value === 'string' && /<script|javascript:|onerror=/i.test(value)
      ? 'ارسال کد در این فیلد مجاز نیست'
      : null;

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const err = error as {
    status?: number;
    message?: string;
    code?: number;
    name?: string;
    errors?: Record<string, { message: string }>;
    keyValue?: Record<string, unknown>;
  };

  let status = err.status ?? 500;
  let message = err.message ?? 'خطای داخلی سرور';
  let details: unknown;

  if (err.name === 'ValidationError' && err.errors) {
    status = 422;
    details = Object.fromEntries(Object.entries(err.errors).map(([key, value]) => [key, value.message]));
    message = 'اطلاعات ارسالی معتبر نیست';
  } else if (err.code === 11000 && err.keyValue) {
    status = 409;
    const field = Object.keys(err.keyValue)[0];
    const labels: Record<string, string> = { email: 'ایمیل', name: 'نام', slug: 'نامک', key: 'کلید' };
    message = `${labels[field] ?? field} تکراری است`;
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'شناسه ارسال شده معتبر نیست';
  }

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(error);
    if (env.isProd) message = 'خطای داخلی سرور';
  }

  res.status(status).json({ success: false, message, details });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `مسیر مورد نظر یافت نشد: ${req.method} ${req.originalUrl}`,
  });
};