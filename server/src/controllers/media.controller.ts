import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Response } from 'express';
import { Types } from 'mongoose';
import { ADMIN_ROLES, AuthRequest, STAFF_ROLES } from '../middleware/auth.js';
import { Media } from '../models/Media.js';
import { MediaFolder } from '../models/MediaFolder.js';
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

  const [items, total, mediaFolders, createdFolders] = await Promise.all([
    Media.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Media.countDocuments(filter),
    Media.distinct('folder'),
    MediaFolder.find().select('name').lean(),
  ]);

  const folderSet = new Set<string>([
    ...mediaFolders.filter(Boolean).map(String),
    ...createdFolders.map((folder) => String(folder.name)).filter(Boolean),
  ]);
  const folders = [...folderSet].sort((a, b) => a.localeCompare(b, 'fa'));

  // Ensure every folder that already holds media has a backing document so it
  // can be renamed/deleted from the admin UI.
  if (folderSet.size) {
    await MediaFolder.bulkWrite(
      [...folderSet].map((name) => ({
        updateOne: { filter: { name }, update: { $setOnInsert: { name } }, upsert: true },
      })),
    );
  }

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

/** GET /api/admin/media/folders — list folders (including empty created ones). */
export const listFolders = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const folders = await MediaFolder.find().sort({ name: 1 }).lean();
  return sendSuccess(res, folders);
});

/** POST /api/admin/media/folders — create a folder with a custom name (admin only). */
export const createFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') throw ApiError.forbidden();

  const name = String(req.body?.name ?? req.body?.folder ?? '').trim();
  if (!name) throw ApiError.badRequest('نام پوشه الزامی است');
  if (name.length > 80) throw ApiError.badRequest('نام پوشه نباید بیشتر از ۸۰ کاراکتر باشد');
  if (/[\\/]/.test(name)) throw ApiError.badRequest('نام پوشه نمی‌تواند شامل مسیر باشد');

  const existing = await MediaFolder.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
  if (existing) throw ApiError.badRequest('پوشه‌ای با این نام وجود دارد');

  // Also prevent colliding with a folder already implied by uploaded media.
  const collision = await Media.exists({ folder: new RegExp(`^${escapeRegex(name)}$`, 'i') });
  if (collision) throw ApiError.badRequest('پوشه‌ای با این نام وجود دارد');

  const folder = await MediaFolder.create({ name });
  return sendSuccess(res, { ...folder.toObject(), folder: folder.name }, {
    status: 201,
    message: 'پوشه ایجاد شد',
  });
});

/** PUT /api/admin/media/folders/:id — rename a folder (admin only). */
export const updateFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') throw ApiError.forbidden();
  assertObjectId(req.params.id, 'شناسه پوشه');

  const name = String(req.body?.name ?? req.body?.folder ?? '').trim();
  if (!name) throw ApiError.badRequest('نام پوشه الزامی است');
  if (name.length > 80) throw ApiError.badRequest('نام پوشه نباید بیشتر از ۸۰ کاراکتر باشد');
  if (/[\\/]/.test(name)) throw ApiError.badRequest('نام پوشه نمی‌تواند شامل مسیر باشد');

  const folder = await MediaFolder.findById(req.params.id);
  if (!folder) throw ApiError.notFound('پوشه یافت نشد');

  if (folder.name === name) {
    return sendSuccess(res, { ...folder.toObject(), folder: folder.name }, { message: 'پوشه به‌روزرسانی شد' });
  }

  const collision = await MediaFolder.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i'), _id: { $ne: folder._id } });
  if (collision) throw ApiError.badRequest('پوشه‌ای با این نام وجود دارد');

  const mediaCollision = await Media.exists({ folder: new RegExp(`^${escapeRegex(name)}$`, 'i') });
  if (mediaCollision) throw ApiError.badRequest('پوشه‌ای با این نام وجود دارد');

  const oldName = folder.name;
  folder.name = name;
  await folder.save();

  if (oldName !== name) {
    await Media.updateMany({ folder: oldName }, { $set: { folder: name } });
  }

  return sendSuccess(res, { ...folder.toObject(), folder: folder.name }, { message: 'پوشه به‌روزرسانی شد' });
});

/** DELETE /api/admin/media/folders/:id — remove an empty created folder (admin only). */
export const removeFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') throw ApiError.forbidden();
  assertObjectId(req.params.id, 'شناسه پوشه');

  const folder = await MediaFolder.findById(req.params.id);
  if (!folder) throw ApiError.notFound('پوشه یافت نشد');

  const count = await Media.countDocuments({ folder: folder.name });
  if (count > 0) {
    // Keep the files but move them out of the deleted folder so it disappears.
    await Media.updateMany({ folder: folder.name }, { $set: { folder: 'general' } });
  }

  await MediaFolder.findByIdAndDelete(req.params.id);
  return sendSuccess(res, { id: req.params.id }, {
    message: count > 0 ? 'پوشه حذف شد و فایل‌های آن به پوشه general منتقل شدند' : 'پوشه حذف شد',
  });
});
