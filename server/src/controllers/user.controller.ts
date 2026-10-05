import { Response } from 'express';
import { ADMIN_ROLES, AuthRequest } from '../middleware/auth.js';
import { Article } from '../models/Article.js';
import { Comment } from '../models/Comment.js';
import { User, UserRole, UserStatus } from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { assertObjectId, buildPageMeta, escapeRegex, parsePagination, slugify } from '../utils/helpers.js';
import { sendSuccess } from '../utils/respond.js';

const SORTABLE = ['newest', 'oldest', 'name'] as const;

/** GET /api/admin/users */
export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query.page as string, req.query.limit as string, 100);
  const { role, status, q, sort } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (role && role !== 'all') filter.role = role;
  if (status && status !== 'all') filter.status = status;
  if (q) {
    const regex = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    name: { name: 1 },
  };
  const sortKey = (SORTABLE as readonly string[]).includes(sort) ? sort : 'newest';

  const [users, total, counts] = await Promise.all([
    User.find(filter).sort(sortMap[sortKey]).skip(skip).limit(limit).lean({ virtuals: true }),
    User.countDocuments(filter),
    User.aggregate<{ _id: UserRole; count: number }>([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
  ]);

  const withStats = await Promise.all(
    users.map(async (user) => ({
      ...user,
      postsCount: await Article.countDocuments({ author: user._id }),
    })),
  );

  return sendSuccess(res, withStats, {
    meta: {
      ...buildPageMeta(total, page, limit),
      roleCounts: Object.fromEntries(counts.map((item) => [item._id, item.count])),
    },
  });
});

/** GET /api/admin/users/:id */
export const getOne = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه کاربر');
  const user = await User.findById(req.params.id).lean({ virtuals: true });
  if (!user) throw ApiError.notFound('کاربر یافت نشد');

  const postsCount = await Article.countDocuments({ author: user._id });
  return sendSuccess(res, { ...user, postsCount });
});

/** GET /api/authors/:slug — public author profile with published article counts. */
export const getPublicAuthor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;
  const author = /^[0-9a-fA-F]{24}$/.test(slug)
    ? await User.findById(slug).select('name slug avatar bio role')
    : await User.findOne({ slug }).select('name slug avatar bio role');
  if (!author) throw ApiError.notFound('نویسنده یافت نشد');

  const articlesCount = await Article.countDocuments({ author: author._id, status: 'published' });
  return sendSuccess(res, { ...author.toObject(), articlesCount });
});

/** POST /api/admin/users */
export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, password, role, status, bio, avatar } = req.body as Record<string, any>;

  const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (exists) throw ApiError.conflict('کاربری با این ایمیل وجود دارد');

  const user = await User.create({
    name,
    email,
    password,
    role: (role as UserRole) ?? 'author',
    status: (status as UserStatus) ?? 'active',
    bio,
    avatar,
    slug: slugify(name, 'user'),
  });

  return sendSuccess(res, user.toJSON(), { status: 201, message: 'کاربر ایجاد شد' });
});

/** PUT /api/admin/users/:id */
export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه کاربر');
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw ApiError.notFound('کاربر یافت نشد');

  const body = req.body as Record<string, any>;

  if (body.role && body.role !== user.role) {
    if (!ADMIN_ROLES.includes(req.user?.role as UserRole)) {
      throw ApiError.forbidden('فقط مدیر می‌تواند سطح دسترسی را تغییر دهد');
    }
    if (user.role === 'admin' && body.role !== 'admin') {
      const admins = await User.countDocuments({ role: 'admin', status: 'active' });
      if (admins <= 1) throw ApiError.badRequest('حداقل یک مدیر باید باقی بماند');
    }
    user.role = body.role;
  }

  if (body.email && body.email.toLowerCase() !== user.email) {
    const exists = await User.findOne({ email: body.email.toLowerCase() }).select('_id').lean();
    if (exists) throw ApiError.conflict('این ایمیل قبلاً استفاده شده است');
    user.email = body.email;
  }

  if (body.name) user.name = body.name;
  if (body.bio !== undefined) user.bio = body.bio;
  if (body.avatar !== undefined) user.avatar = body.avatar;
  if (body.status) user.status = body.status;
  if (body.password) user.password = body.password;

  await user.save();
  return sendSuccess(res, user.toJSON(), { message: 'کاربر به‌روزرسانی شد' });
});

/** PATCH /api/admin/users/:id/status */
export const updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه کاربر');
  const { status } = req.body as { status: UserStatus };
  if (!['active', 'pending', 'suspended'].includes(status)) {
    throw ApiError.badRequest('وضعیت انتخاب شده معتبر نیست');
  }
  if (String(req.user?._id) === req.params.id && status !== 'active') {
    throw ApiError.badRequest('نمی‌توانید حساب خودتان را غیرفعال کنید');
  }

  const user = await User.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
  if (!user) throw ApiError.notFound('کاربر یافت نشد');

  return sendSuccess(res, user.toJSON(), { message: 'وضعیت کاربر تغییر کرد' });
});

/** DELETE /api/admin/users/:id */
export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه کاربر');

  if (String(req.user?._id) === req.params.id) {
    throw ApiError.badRequest('نمی‌توانید حساب خودتان را حذف کنید');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('کاربر یافت نشد');

  if (user.role === 'admin') {
    const admins = await User.countDocuments({ role: 'admin', status: 'active' });
    if (admins <= 1) throw ApiError.badRequest('حداقل یک مدیر باید باقی بماند');
  }

  const postsCount = await Article.countDocuments({ author: user._id });
  if (postsCount > 0) {
    throw ApiError.badRequest(`این کاربر ${postsCount} خبر دارد. ابتدا خبرهای او را جابجا کنید.`);
  }

  await Promise.all([user.deleteOne(), Comment.updateMany({ author: user._id }, { $set: { author: null } })]);

  return sendSuccess(res, { id: req.params.id }, { message: 'کاربر حذف شد' });
});