import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'];
const ALLOWED_TYPES = [...IMAGE_TYPES, 'application/pdf', 'video/mp4', 'video/webm'];

fs.mkdirSync(env.uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const now = new Date();
    const folder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const target = path.join(env.uploadsDir, folder);
    fs.mkdirSync(target, { recursive: true });
    cb(null, target);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const base = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^\p{L}\p{N}-]+/gu, '-')
      .slice(0, 60);
    cb(null, `${base || 'file'}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`فرمت فایل پشتیبانی نمی‌شود: ${file.mimetype}`));
    }
    return cb(null, true);
  },
});

export const isImage = (mimeType: string) => IMAGE_TYPES.includes(mimeType);

/** Builds the public URL for an uploaded file. */
export const publicUrlFor = (filename: string, folder: string) =>
  `${env.publicUrl}/uploads/${folder}/${filename}`.replace(/([^:]\/)\/+/g, '$1');