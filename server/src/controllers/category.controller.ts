import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { Article } from '../models/Article.js';
import { Category } from '../models/Category.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { assertObjectId, slugify } from '../utils/helpers.js';
import { sendSuccess } from '../utils/respond.js';

/** GET /api/categories — public tree with published article counts. */
export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const includeInactive = req.query.all === 'true' && Boolean(req.user);

  const filter = includeInactive ? {} : { isActive: true };
  const categories = await Category.find(filter).sort({ order: 1, name: 1 }).lean();

  const counts = await Article.aggregate<{ _id: string; count: number }>([
    { $match: { status: 'published' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((item) => [String(item._id), item.count]));

  const withCounts = categories.map((category) => ({
    ...category,
    articlesCount: countMap.get(String(category._id)) ?? 0,
  }));

  return sendSuccess(res, withCounts);
});

/** GET /api/categories/:slug */
export const getBySlug = asyncHandler(async (req: AuthRequest, res: Response) => {
  const category = await Category.findOne({ slug: req.params.slug }).lean();
  if (!category) throw ApiError.notFound('دسته‌بندی یافت نشد');

  const articlesCount = await Article.countDocuments({ category: category._id, status: 'published' });
  return sendSuccess(res, { ...category, articlesCount });
});

/** POST /api/admin/categories */
export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, slug, description, color, icon, cover, parent, order, isActive, showInMenu } = req.body;

  const uniqueSlug = await ensureUniqueSlug(slug || name);
  const category = await Category.create({
    name,
    slug: uniqueSlug,
    description,
    color,
    icon,
    cover,
    parent: parent || null,
    order,
    isActive,
    showInMenu,
  });

  return sendSuccess(res, category, { status: 201, message: 'دسته‌بندی ایجاد شد' });
});

/** PUT /api/admin/categories/:id */
export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه دسته‌بندی');
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('دسته‌بندی یافت نشد');

  const body = req.body as Record<string, any>;
  if (body.parent && String(body.parent) === category.id) {
    throw ApiError.badRequest('دسته‌بندی نمی‌تواند والد خودش باشد');
  }
  if (body.slug && body.slug !== category.slug) {
    category.slug = await ensureUniqueSlug(body.slug, category.id);
  }
  if (body.name) category.name = body.name;
  if (body.description !== undefined) category.description = body.description;
  if (body.color !== undefined) category.color = body.color;
  if (body.icon !== undefined) category.icon = body.icon;
  if (body.cover !== undefined) category.cover = body.cover;
  if (body.parent !== undefined) category.parent = body.parent || null;
  if (body.order !== undefined) category.order = body.order;
  if (body.isActive !== undefined) category.isActive = Boolean(body.isActive);
  if (body.showInMenu !== undefined) category.showInMenu = Boolean(body.showInMenu);

  await category.save();
  return sendSuccess(res, category, { message: 'دسته‌بندی به‌روزرسانی شد' });
});

/** DELETE /api/admin/categories/:id */
export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه دسته‌بندی');
  const articlesCount = await Article.countDocuments({ category: req.params.id });
  if (articlesCount > 0) {
    throw ApiError.badRequest(`این دسته‌بندی ${articlesCount} خبر دارد. ابتدا خبرهای آن را جابجا کنید.`);
  }

  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw ApiError.notFound('دسته‌بندی یافت نشد');

  return sendSuccess(res, { id: req.params.id }, { message: 'دسته‌بندی حذف شد' });
});

/** POST /api/admin/categories/reorder */
export const reorder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { items } = req.body as { items: { id: string; order: number }[] };
  if (!Array.isArray(items)) throw ApiError.badRequest('ساختار ارسالی نامعتبر است');

  await Category.bulkWrite(
    items.map((item) => ({
      updateOne: { filter: { _id: item.id }, update: { $set: { order: item.order } } },
    })),
  );

  return sendSuccess(res, null, { message: 'ترتیب دسته‌بندی‌ها ذخیره شد' });
});

const ensureUniqueSlug = async (input: string, currentId?: string): Promise<string> => {
  const base = slugify(input, 'category');
  let candidate = base;
  let counter = 1;

  while (true) {
    const existing = await Category.findOne({ slug: candidate }).select('_id').lean();
    if (!existing || (currentId && String(existing._id) === currentId)) return candidate;
    candidate = `${base}-${counter++}`;
  }
};