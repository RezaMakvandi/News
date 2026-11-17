import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Response } from 'express';
import { Types } from 'mongoose';
import { ADMIN_ROLES, AuthRequest, STAFF_ROLES } from '../middleware/auth.js';
import { Media } from '../models/Media.js';
import { env } from '../config/env.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { assertObjectId, buildPageMeta, escapeRegex, parsePagination } from '../utils/helpers.js';
import { sendSuccess } from '../utils/respond.js';

/**
 * MongoDB documents are capped at 16 MB, so images up to the upload limit fit
 * comfortably while larger files (videos, long PDFs) stay on disk.
 */
const MAX_DB_BYTES = 12 * 1024 * 1024;

/** Site-relative URL for a file on disk; the browser resolves it against the portal origin. */
const diskUrlFor = (file: Express.Multer.File) => {
  const relative = path.relative(env.uploadsDir, file.path).split(path.sep).join('/');
  return `/uploads/${relative}`;
};

/** URL served from the document bytes stored in MongoDB. */
const dbUrlFor = (id: Types.ObjectId) => `/api/media/${id.toHexString()}/file`;

/** Extracts `<folder>/<file>` from any `/uploads/...` URL (absolute or relative). */
const uploadsRelative = (url: string): string | null => {
  const marker = '/uploads/';
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
};

/** Resolves a media URL to its file under `uploads/`, rejecting path escapes. */
const diskPathForUrl = (url: string): string | null => {
  const relative = uploadsRelative(url);
  if (!relative) return null;

  const root = path.resolve(env.uploadsDir);
  const target = path.resolve(root, relative);
  return target.startsWith(`${root}${path.sep}`) ? target : null;
};

const removeDiskFile = (url: string): void => {
  const target = diskPathForUrl(url);
  if (target && fs.existsSync(target)) fs.unlinkSync(target);
};

/** POST /api/admin/media — single or multiple upload. */
export const uploadFiles = asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = (req.files as Express.Multer.File[]) ?? (req.file ? [req.file] : []);
  if (files.length === 0) throw ApiError.badRequest('فایلی ارسال نشده است');

  const folder = String(req.body?.folder ?? 'general');
  const alt = String(req.body?.alt ?? '');

  const createdIds: Types.ObjectId[] = [];
  const created = [];

  try {
    for (const file of files) {
      const isDbImage = file.mimetype.startsWith('image/') && file.size <= MAX_DB_BYTES;
      const id = new Types.ObjectId();
      const base = {
        _id: id,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        alt,
        folder,
        uploadedBy: req.user?._id ?? null,
      };

      if (isDbImage) {
        // Images live inside MongoDB; the temp file written by multer is only
        // a staging buffer and is removed once the document is saved.
        const data = await fsp.readFile(file.path);
        const media = await Media.create({
          ...base,
          url: dbUrlFor(id),
          storage: 'db',
          data,
        });
        await fsp.rm(file.path, { force: true });
        createdIds.push(id);
        created.push(media);
      } else {
        const media = await Media.create({
          ...base,
          url: diskUrlFor(file),
          storage: 'disk',
        });
        createdIds.push(id);
        created.push(media);
      }
    }
  } catch (error) {
    // Roll back this request: remove documents that made it in and any temp
    // files multer left behind.
    if (createdIds.length) await Media.deleteMany({ _id: { $in: createdIds } }).catch(() => undefined);
    await Promise.all(files.map((file) => fsp.rm(file.path, { force: true }).catch(() => undefined)));
    throw error;
  }

  return sendSuccess(res, created, {
    status: 201,
    message: 'فایل با موفقیت بارگذاری شد',
  });
});

/** GET /api/admin/media */
export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query.page as string, req.query.limit as string, 200);
  const { q, folder, type } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (folder && folder !== 'all') filter.folder = folder;
  if (q) filter.originalName = { $regex: escapeRegex(q), $options: 'i' };
  if (type === 'image') filter.mimeType = { $regex: '^image/', $options: 'i' };
  if (type === 'video') filter.mimeType = { $regex: '^video/', $options: 'i' };

  const [items, total, folders] = await Promise.all([
    Media.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Media.countDocuments(filter),
    Media.distinct('folder'),
  ]);

  return sendSuccess(res, items, { meta: { ...buildPageMeta(total, page, limit), folders } });
});

/**
 * GET /api/media/:id/file — streams a media file.
 *
 * Images are stored as bytes inside the media document and are served here.
 * Older records that still point at `uploads/...` on disk fall back to the
 * file system so they keep working until the media migration has run.
 */
export const file = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه فایل');

  // `.lean()` would hand back a BSON `Binary`; the hydrated document gives us
  // a real Node Buffer that `res.send` can stream as-is.
  const media = await Media.findById(req.params.id).select('+data');
  if (!media) throw ApiError.notFound('فایل یافت نشد');

  res.setHeader('Content-Type', media.mimeType || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  if (media.mimeType === 'image/svg+xml') {
    // Uploaded SVGs can carry scripts; never let them run on the API origin.
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  }

  if (media.data?.length) return res.send(media.data);

  const fallback = diskPathForUrl(media.url);
  if (fallback && fs.existsSync(fallback)) {
    return res.sendFile(fallback, {
      maxAge: '365d',
      immutable: true,
      headers: { 'Content-Type': media.mimeType || 'application/octet-stream' },
    });
  }

  throw ApiError.notFound('فایل یافت نشد');
});

/** PUT /api/admin/media/:id */
export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه فایل');
  const { alt, folder } = req.body as { alt?: string; folder?: string };

  const media = await Media.findByIdAndUpdate(
    req.params.id,
    { $set: { ...(alt !== undefined ? { alt } : {}), ...(folder ? { folder } : {}) } },
    { new: true },
  );
  if (!media) throw ApiError.notFound('فایل یافت نشد');

  return sendSuccess(res, media, { message: 'اطلاعات فایل به‌روزرسانی شد' });
});

/** DELETE /api/admin/media/:id */
export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه فایل');

  if (!ADMIN_ROLES.includes(req.user?.role as never) && !STAFF_ROLES.includes(req.user?.role as never)) {
    throw ApiError.forbidden();
  }

  const media = await Media.findByIdAndDelete(req.params.id);
  if (!media) throw ApiError.notFound('فایل یافت نشد');

  // DB-backed images disappear with the document; disk-backed files are
  // unlinked so no orphan stays behind.
  removeDiskFile(media.url);

  return sendSuccess(res, { id: req.params.id }, { message: 'فایل حذف شد' });
});
