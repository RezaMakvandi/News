import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { Tag } from '../models/Tag.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { assertObjectId, buildPageMeta, escapeRegex, parsePagination, slugify } from '../utils/helpers.js';
import { sendSuccess } from '../utils/respond.js';

/** GET /api/tags */
export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query.page as string, req.query.limit as string, 200);
  const { q, sort } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    popular: { usageCount: -1, name: 1 },
    newest: { createdAt: -1 },
    name: { name: 1 },
  };

  const [tags, total] = await Promise.all([
    Tag.find(filter).sort(sortMap[sort] ?? sortMap.popular).skip(skip).limit(limit).lean(),
    Tag.countDocuments(filter),
  ]);

  return sendSuccess(res, tags, { meta: buildPageMeta(total, page, limit) });
});

/** GET /api/tags/popular — cloud for the sidebar. */
export const popular = asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = Math.min(40, Number(req.query.limit) || 18);
  const tags = await Tag.find({ usageCount: { $gt: 0 } }).sort({ usageCount: -1 }).limit(limit).lean();
  return sendSuccess(res, tags);
});

/** POST /api/admin/tags */
export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, description, slug } = req.body;
  const tag = await Tag.create({ name, description, slug: await ensureUniqueSlug(slug || name) });
  return sendSuccess(res, tag, { status: 201, message: 'برچسب ایجاد شد' });
});

/** PUT /api/admin/tags/:id */
export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه برچسب');
  const tag = await Tag.findById(req.params.id);
  if (!tag) throw ApiError.notFound('برچسب یافت نشد');

  const body = req.body as Record<string, any>;
  if (body.name) tag.name = body.name;
  if (body.description !== undefined) tag.description = body.description;
  if (body.slug && body.slug !== tag.slug) tag.slug = await ensureUniqueSlug(body.slug, tag.id);

  await tag.save();
  return sendSuccess(res, tag, { message: 'برچسب به‌روزرسانی شد' });
});

/** DELETE /api/admin/tags/:id */
export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه برچسب');
  const tag = await Tag.findByIdAndDelete(req.params.id);
  if (!tag) throw ApiError.notFound('برچسب یافت نشد');
  return sendSuccess(res, { id: req.params.id }, { message: 'برچسب حذف شد' });
});

const ensureUniqueSlug = async (input: string, currentId?: string): Promise<string> => {
  const base = slugify(input, 'tag');
  let candidate = base;
  let counter = 1;

  while (true) {
    const existing = await Tag.findOne({ slug: candidate }).select('_id').lean();
    if (!existing || (currentId && String(existing._id) === currentId)) return candidate;
    candidate = `${base}-${counter++}`;
  }
};