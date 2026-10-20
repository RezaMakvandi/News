import { NextFunction, Request, Response } from "express";
import { Setting } from "../models/Setting.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { AuthRequest } from "./auth.js";

let cachedValue: boolean | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;

/**
 * Reads the `shopEnabled` setting (admin panel overrides the `.env` default).
 * Cached briefly so the public catalog endpoints stay cheap.
 */
export const isShopEnabled = async (): Promise<boolean> => {
  if (cachedValue !== null && Date.now() - cachedAt < CACHE_TTL_MS) return cachedValue;

  const row = await Setting.findOne({ key: "shopEnabled" }).lean();
  cachedValue = row ? row.value === true : env.shopEnabled;
  cachedAt = Date.now();
  return cachedValue;
};

/** Clears the cached flag so admin setting changes apply immediately. */
export const invalidateShopEnabledCache = (): void => {
  cachedValue = null;
  cachedAt = 0;
};

/**
 * Blocks public storefront endpoints (`/api/shop/**`) while the shop is
 * disabled. Admin management endpoints (`/api/admin/shop/**`) stay reachable
 * so administrators can still prepare products before re-enabling.
 */
export const requireShopEnabled = (
  _req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  isShopEnabled().then(
    (enabled) => {
      if (enabled) return next();
      return next(ApiError.forbidden("فروشگاه در حال حاضر غیرفعال است"));
    },
    (error: unknown) => next(error),
  );
};
