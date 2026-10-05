import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User, UserRole, IUser } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export interface AuthRequest extends Request {
  user?: IUser;
}

interface TokenPayload {
  id: string;
  role: UserRole;
}

export const signToken = (user: { _id: mongoose.Types.ObjectId | string; role: UserRole }): string =>
  jwt.sign({ id: String(user._id), role: user.role } satisfies TokenPayload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });

const readToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.token;
  return cookieToken ?? null;
};

/** Attaches req.user when a valid token is present; never throws. */
export const attachUser = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const token = readToken(req);
    if (!token) return next();

    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    const user = await User.findById(payload.id);
    if (user && user.status === 'active') {
      req.user = user;
    }
    return next();
  } catch {
    return next();
  }
};

export const requireAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (!req.user) return next(ApiError.unauthorized());
  return next();
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    return next();
  };

export const ADMIN_ROLES: UserRole[] = ['admin', 'editor'];
export const STAFF_ROLES: UserRole[] = ['admin', 'editor', 'author'];