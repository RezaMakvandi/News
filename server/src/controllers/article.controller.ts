import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { Article, ArticleStatus } from '../models/Article.js';
import { Category } from '../models/Category.js';
import { Comment } from '../models/Comment.js';
import { Tag } from '../models/Tag.js';
import { User } from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import {
  assertObjectId,
  buildPageMeta,
  escapeRegex,
  excerptFrom,
  parsePagination,
  slugify,
} from '../utils/helpers.js';
import { sanitizeHtml } from '../utils/helpers.js';
import { sendSuccess } from '../utils/respond.js';
import { syncTagUsage } from '../services/tag.service.js';

const AUTHOR_FIELDS = 'name slug avatar bio role';
const CATEGORY_FIELDS = 'name slug color icon';

/** Resolves incoming tag values (ids or names) into Tag documents. */
const resolveTags = async (tags: unknown): Promise<string[]> => {
  if (!Array.isArray(tags)) return [];

  const ids: string[] = [];
  for (const raw of tags.slice(0, 15)) {
    const value = String(raw).trim();
    if (!value) continue;

    if (/^[0-9a-fA-F]{24}$/.test(value)) {
      ids.push(value);
      continue;
    }

    const name = value.slice(0, 60);
    const tag = await Tag.findOneAndUpdate(
      { slug: slugify(name, 'tag') },
      { $setOnInsert: { name } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    ids.push(tag.id);
  }
  return ids;
};

const uniqueSlug = async (title: string, currentId?: string): Promise<string> => {
  const base = slugify(title, 'news');
  let candidate = base;
  let counter = 1;

  while (true) {
    const existing = await Article.findOne({ slug: candidate }).select('_id').lean();
    if (!existing || (currentId && String(existing._id) === currentId)) return candidate;
    candidate = `${base}-${counter++}`;
  }
};

const buildPublicFilter = () => ({ status: 'published' as ArticleStatus });

/* ------------------------------------------------------------------ */
/* Public endpoints                                                    */
/* ------------------------------------------------------------------ */

/** GET /api/articles */
export const listPublished = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query.page as string, req.query.limit as string);
  const filter: Record<string, unknown> = { ...buildPublicFilter() };

  const { category, tag, q, author, type, featured, breaking } = req.query as Record<string, string>;

  if (category) {
    const categoryDoc = /^[0-9a-fA-F]{24}$/.test(category)
      ? await Category.findById(category)
      : await Category.findOne({ slug: category });
    if (!categoryDoc) throw ApiError.notFound('دسته‌بندی یافت نشد');
    filter.category = categoryDoc._id;
  }
  if (tag) {
    const tagDoc = /^[0-9a-fA-F]{24}$/.test(tag) ? await Tag.findById(tag) : await Tag.findOne({ slug: tag });
    if (!tagDoc) throw ApiError.notFound('برچسب یافت نشد');
    filter.tags = tagDoc._id;
  }
  if (author) {
      const authorDoc = /^[0-9a-fA-F]{24}$/.test(author)
        ? await User.findById(author).select('_id')
        : await User.findOne({ slug: author }).select('_id');
      filter.author = authorDoc ? authorDoc._id : { $exists: false };
    }
  if (type) filter.type = type;
  if (featured === 'true') filter.isFeatured = true;
  if (breaking === 'true') filter.isBreaking = true;
  if (q) filter.title = { $regex: escapeRegex(q), $options: 'i' };

  const [articles, total] = await Promise.all([
    Article.find(filter)
      .sort({ isPinned: -1, publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('category', CATEGORY_FIELDS)
      .populate('author', AUTHOR_FIELDS)
      .populate('tags', 'name slug')
      .lean({ virtuals: true }),
    Article.countDocuments(filter),
  ]);

  return sendSuccess(res, articles, { meta: buildPageMeta(total, page, limit) });
});

/** GET /api/articles/headlines — hero + featured + breaking block. */
export const getHeadlines = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const base = buildPublicFilter();

  const [hero, breaking, featured, latest] = await Promise.all([
    Article.findOne({ ...base, isFeatured: true }).sort({ publishedAt: -1 })
      .populate('category', CATEGORY_FIELDS).populate('author', AUTHOR_FIELDS).lean({ virtuals: true }),
    Article.find({ ...base, isBreaking: true }).sort({ publishedAt: -1 }).limit(6)
      .select('title slug publishedAt category').populate('category', 'name slug color').lean(),
    Article.find({ ...base, isFeatured: true }).sort({ publishedAt: -1 }).limit(4)
      .populate('category', CATEGORY_FIELDS).populate('author', AUTHOR_FIELDS).lean({ virtuals: true }),
    Article.find(base).sort({ publishedAt: -1 }).limit(8)
      .populate('category', CATEGORY_FIELDS).populate('author', AUTHOR_FIELDS).lean({ virtuals: true }),
  ]);

  return sendSuccess(res, { hero: hero ?? latest[0] ?? null, breaking, featured, latest });
});

/** GET /api/articles/popular */
export const getPopular = asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = Math.min(20, Number(req.query.limit) || 6);
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14);

  const articles = await Article.find({ ...buildPublicFilter(), publishedAt: { $gte: since } })
    .sort({ views: -1, likes: -1 })
    .limit(limit)
    .populate('category', CATEGORY_FIELDS)
    .lean();

  return sendSuccess(res, articles);
});

/** GET /api/articles/:slug */
export const getBySlug = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;

  const article = await Article.findOneAndUpdate(
    { slug, status: 'published' },
    { $inc: { views: 1 } },
    { new: true },
  )
    .populate('category', CATEGORY_FIELDS)
    .populate('author', AUTHOR_FIELDS)
    .populate('tags', 'name slug');

  if (!article) throw ApiError.notFound('خبر مورد نظر یافت نشد');

  const related = await Article.find({
    ...buildPublicFilter(),
    _id: { $ne: article._id },
    $or: [{ category: article.category }, { tags: { $in: article.tags } }],
  })
    .sort({ publishedAt: -1 })
    .limit(5)
    .populate('category', CATEGORY_FIELDS)
    .lean();

  return sendSuccess(res, { article: article.toJSON(), related });
});

/** GET /api/articles/:slug/neighbors — previous/next article. */
export const getNeighbors = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;
  const article = await Article.findOne({ slug, status: 'published' }).select('publishedAt');
  if (!article) throw ApiError.notFound('خبر مورد نظر یافت نشد');

  const [prev, next] = await Promise.all([
    Article.findOne({ ...buildPublicFilter(), publishedAt: { $gt: article.publishedAt } })
      .sort({ publishedAt: 1 }).select('title slug cover').lean(),
    Article.findOne({ ...buildPublicFilter(), publishedAt: { $lt: article.publishedAt } })
      .sort({ publishedAt: -1 }).select('title slug cover').lean(),
  ]);

  return sendSuccess(res, { prev, next });
});

/** POST /api/articles/:slug/like */
export const likeArticle = asyncHandler(async (req: AuthRequest, res: Response) => {
  const article = await Article.findOneAndUpdate(
    { slug: req.params.slug, status: 'published' },
    { $inc: { likes: 1 } },
    { new: true },
  ).select('likes');
  if (!article) throw ApiError.notFound('خبر مورد نظر یافت نشد');
  return sendSuccess(res, { likes: article.likes });
});

/** GET /api/articles/:slug/comments — approved comments with nested replies. */
export const listArticleComments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const article = await Article.findOne({ slug: req.params.slug }).select('_id allowComments');
  if (!article) throw ApiError.notFound('خبر مورد نظر یافت نشد');
  if (!article.allowComments) return sendSuccess(res, { comments: [], allowComments: false });

  const comments = await Comment.find({ article: article._id, status: 'approved' })
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();

  type CommentNode = (typeof comments)[number] & { replies: CommentNode[] };
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    map.set(String(comment._id), { ...comment, replies: [] });
  }
  for (const node of map.values()) {
    const parentId = node.parent ? String(node.parent) : null;
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return sendSuccess(res, { comments: roots, allowComments: true });
});

/** POST /api/articles/:slug/comments */
export const createComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const article = await Article.findOne({ slug: req.params.slug }).select('_id allowComments');
  if (!article) throw ApiError.notFound('خبر مورد نظر یافت نشد');
  if (!article.allowComments) throw ApiError.badRequest('ثبت نظر برای این خبر غیرفعال است');

  const { content, parent, name, email } = req.body as {
    content: string; parent?: string; name?: string; email?: string;
  };

  if (parent) assertObjectId(parent, 'شناسه والد');

  const authorName = req.user?.name ?? (name || '').trim();
  const authorEmail = req.user?.email ?? (email || '').trim().toLowerCase();

  const comment = await Comment.create({
    article: article._id,
    parent: parent || null,
    author: req.user?.id ?? null,
    authorName,
    authorEmail,
    content: content.trim(),
    status: 'pending',
    ip: req.ip ?? '',
    userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300),
  });

  return sendSuccess(
    res,
    { id: comment.id, status: comment.status },
    { status: 201, message: 'نظر شما ثبت شد و پس از تأیید نمایش داده می‌شود.' },
  );
});

/** POST /api/comments/:id/vote — lightweight like/dislike on a comment. */
export const voteComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type } = req.body as { type: 'like' | 'dislike' };
  const field = type === 'dislike' ? 'dislikes' : 'likes';

  const comment = await Comment.findOneAndUpdate(
    { _id: req.params.id, status: 'approved' },
    { $inc: { [field]: 1 } },
    { new: true },
  ).select('likes dislikes');

  if (!comment) throw ApiError.notFound('نظر مورد نظر یافت نشد');
  return sendSuccess(res, { likes: comment.likes, dislikes: comment.dislikes });
});

/* ------------------------------------------------------------------ */
/* Admin endpoints                                                     */
/* ------------------------------------------------------------------ */

/** GET /api/admin/articles */
export const listForAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query.page as string, req.query.limit as string, 100);
  const { status, category, q, author, sort } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};

  if (status && status !== 'all') filter.status = status;
  if (category && category !== 'all') filter.category = category;
  if (author && author !== 'all') filter.author = author;
  if (q) {
    const regex = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ title: regex }, { summary: regex }, { slug: regex }];
  }
  // Authors can only manage their own posts.
  if (req.user?.role === 'author') filter.author = req.user.id;

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    views: { views: -1 },
    title: { title: 1 },
  };

  const [articles, total, counts] = await Promise.all([
    Article.find(filter)
      .sort(sortMap[sort] ?? sortMap.newest)
      .skip(skip)
      .limit(limit)
      .populate('category', CATEGORY_FIELDS)
      .populate('author', AUTHOR_FIELDS)
      .lean({ virtuals: true }),
    Article.countDocuments(filter),
    Article.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  return sendSuccess(res, articles, {
    meta: {
      ...buildPageMeta(total, page, limit),
      statusCounts: Object.fromEntries(counts.map((item) => [item._id, item.count])),
    },
  });
});

/** GET /api/admin/articles/:id */
export const getForAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه خبر');
  const article = await Article.findById(req.params.id)
    .populate('category', CATEGORY_FIELDS)
    .populate('author', AUTHOR_FIELDS)
    .populate('tags', 'name slug');

  if (!article) throw ApiError.notFound('خبر مورد نظر یافت نشد');
  if (req.user?.role === 'author' && String(article.author._id ?? article.author) !== req.user.id) {
    throw ApiError.forbidden('شما فقط به مطالب خود دسترسی دارید');
  }

  return sendSuccess(res, article);
});

/** POST /api/admin/articles */
export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body as Record<string, any>;

  const categoryExists = await Category.exists({ _id: body.category });
  if (!categoryExists) throw ApiError.badRequest('دسته‌بندی انتخاب شده معتبر نیست');

  const article = await Article.create({
    title: body.title,
    slug: await uniqueSlug(body.title),
    summary: body.summary ?? '',
    content: sanitizeHtml(body.content),
    cover: body.cover ?? '',
    coverAlt: body.coverAlt ?? '',
    gallery: Array.isArray(body.gallery) ? body.gallery.slice(0, 20) : [],
    status: body.status ?? 'draft',
    type: body.type ?? 'news',
    category: body.category,
    tags: await resolveTags(body.tags),
    author: body.author && req.user?.role === 'admin' ? body.author : req.user?.id,
    isBreaking: Boolean(body.isBreaking),
    isFeatured: Boolean(body.isFeatured),
    isPinned: Boolean(body.isPinned),
    allowComments: body.allowComments !== false,
    seo: body.seo ?? {},
    source: body.source ?? {},
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    publishedAt: body.status === 'published' ? new Date(body.publishedAt ?? Date.now()) : undefined,
  });

  await syncTagUsage();

  return sendSuccess(res, article, { status: 201, message: 'خبر با موفقیت ایجاد شد' });
});

/** PUT /api/admin/articles/:id */
export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه خبر');

  const article = await Article.findById(req.params.id);
  if (!article) throw ApiError.notFound('خبر مورد نظر یافت نشد');
  if (req.user?.role === 'author' && String(article.author) !== req.user.id) {
    throw ApiError.forbidden('شما فقط به مطالب خود دسترسی دارید');
  }

  const body = req.body as Record<string, any>;

  if (body.category) {
    const categoryExists = await Category.exists({ _id: body.category });
    if (!categoryExists) throw ApiError.badRequest('دسته‌بندی انتخاب شده معتبر نیست');
    article.category = body.category;
  }

  if (body.title && body.title !== article.title) {
    article.title = body.title;
    article.slug = await uniqueSlug(body.title, article.id);
  }

  if (body.content !== undefined) article.content = sanitizeHtml(body.content);
  if (body.summary !== undefined) article.summary = body.summary;
  if (body.cover !== undefined) article.cover = body.cover;
  if (body.coverAlt !== undefined) article.coverAlt = body.coverAlt;
  if (Array.isArray(body.gallery)) article.gallery = body.gallery.slice(0, 20);
  if (body.type) article.type = body.type;
  if (Array.isArray(body.tags)) article.tags = (await resolveTags(body.tags)) as never;

  if (body.isBreaking !== undefined) article.isBreaking = Boolean(body.isBreaking);
  if (body.isFeatured !== undefined) article.isFeatured = Boolean(body.isFeatured);
  if (body.isPinned !== undefined) article.isPinned = Boolean(body.isPinned);
  if (body.allowComments !== undefined) article.allowComments = Boolean(body.allowComments);
  if (body.seo !== undefined) article.seo = body.seo;
  if (body.source !== undefined) article.source = body.source;
  if (body.scheduledAt !== undefined) {
    article.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : undefined;
  }
  if (body.author && ['admin', 'editor'].includes(req.user?.role ?? '')) article.author = body.author;

  if (body.status && body.status !== article.status) {
    article.status = body.status;
    if (body.status === 'published' && !article.publishedAt) {
      article.publishedAt = new Date();
    }
  }

  await article.save();
  await syncTagUsage();

  return sendSuccess(res, article, { message: 'خبر با موفقیت به‌روزرسانی شد' });
});

/** PATCH /api/admin/articles/:id/status */
export const updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه خبر');
  const { status } = req.body as { status: ArticleStatus };
  const allowed: ArticleStatus[] = ['draft', 'pending', 'published', 'archived'];
  if (!allowed.includes(status)) throw ApiError.badRequest('وضعیت انتخاب شده معتبر نیست');

  const article = await Article.findById(req.params.id);
  if (!article) throw ApiError.notFound('خبر مورد نظر یافت نشد');
  if (req.user?.role === 'author' && String(article.author) !== req.user.id) {
    throw ApiError.forbidden('شما فقط به مطالب خود دسترسی دارید');
  }

  article.status = status;
  if (status === 'published' && !article.publishedAt) article.publishedAt = new Date();
  await article.save();

  return sendSuccess(res, { id: article.id, status: article.status }, { message: 'وضعیت خبر تغییر کرد' });
});

/** POST /api/admin/articles/bulk — bulk publish/archive/delete. */
export const bulkAction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { ids, action } = req.body as { ids: string[]; action: 'publish' | 'archive' | 'draft' | 'delete' };
  if (!Array.isArray(ids) || ids.length === 0) throw ApiError.badRequest('هیچ خبری انتخاب نشده است');
  ids.forEach((id) => assertObjectId(id, 'شناسه خبر'));

  const filter: Record<string, unknown> = { _id: { $in: ids } };
  if (req.user?.role === 'author') filter.author = req.user?.id;

  if (action === 'delete') {
    const result = await Article.deleteMany(filter);
    return sendSuccess(res, { deleted: result.deletedCount }, { message: 'خبرهای انتخاب شده حذف شدند' });
  }

  const statusMap = { publish: 'published', archive: 'archived', draft: 'draft' } as const;
  const status = statusMap[action];
  if (!status) throw ApiError.badRequest('عملیات انتخاب شده معتبر نیست');

  const result = await Article.updateMany(filter, {
    $set: { status, ...(status === 'published' ? { publishedAt: new Date() } : {}) },
  });

  return sendSuccess(res, { modified: result.modifiedCount }, { message: 'عملیات با موفقیت انجام شد' });
});

/** DELETE /api/admin/articles/:id */
export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه خبر');
  const article = await Article.findById(req.params.id);
  if (!article) throw ApiError.notFound('خبر مورد نظر یافت نشد');
  if (req.user?.role === 'author' && String(article.author) !== req.user.id) {
    throw ApiError.forbidden('شما فقط به مطالب خود دسترسی دارید');
  }

  await article.deleteOne();
  await Promise.all([Comment.deleteMany({ article: article._id }), syncTagUsage()]);

  return sendSuccess(res, { id: req.params.id }, { message: 'خبر حذف شد' });
});