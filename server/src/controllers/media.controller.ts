import fs from 'node:fs';
import path from 'node:path';
import { Response } from 'express';
import { ADMIN_ROLES, AuthRequest, STAFF_ROLES } from '../middleware/auth.js';
import { Media } from '../models/Media.js';
import { env } from '../config/env.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { assertObjectId, buildPageMeta, escapeRegex, parsePagination } from '../utils/helpers.js';
import { sendSuccess } from '../utils/respond.js';

const urlFor = (file: Express.Multer.File) => {
  const relative = path.relative(env.uploadsDir, file.path).split(path.sep).join('/');
  return `${env.publicUrl}/uploads/${relative}`.replace(/([^:]\/)\/+/g, '$1');
};

/** POST /api/admin/media — single or multiple upload. */
export const uploadFiles = asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = (req.files as Express.Multer.File[]) ?? (req.file ? [req.file] : []);
  if (files.length === 0) throw ApiError.badRequest('فایلی ارسال نشده است');

  const folder = String(req.body?.folder ?? 'general');
  const alt = String(req.body?.alt ?? '');

  const created = await Media.create(
    files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      url: urlFor(file),
      mimeType: file.mimetype,
      size: file.size,
      alt,
      folder,
      uploadedBy: req.user?._id ?? null,
    })),
  );

  return sendSuccess(res, Array.isArray(created) ? created : [created], {
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

  const filePath = path.join(env.uploadsDir, media.url.split('/uploads/')[1] ?? '');
  if (filePath.startsWith(env.uploadsDir) && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return sendSuccess(res, { id: req.params.id }, { message: 'فایل حذف شد' });
});