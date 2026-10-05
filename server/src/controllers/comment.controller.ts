import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { Article } from '../models/Article.js';
import { Comment, CommentStatus } from '../models/Comment.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { assertObjectId, buildPageMeta, escapeRegex, parsePagination } from '../utils/helpers.js';
import { sendSuccess } from '../utils/respond.js';

const recalcCommentsCount = async (articleId: unknown) => {
  const count = await Comment.countDocuments({ article: articleId, status: 'approved' });
  await Article.findByIdAndUpdate(articleId, { $set: { commentsCount: count } });
};

/** GET /api/admin/comments */
export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query.page as string, req.query.limit as string, 100);
  const { status, q, article } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (status && status !== 'all') filter.status = status;
  if (article) filter.article = article;
  if (q) {
    const regex = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ content: regex }, { authorName: regex }, { authorEmail: regex }];
  }

  const [comments, total, counts] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('article', 'title slug')
      .populate('moderatedBy', 'name')
      .lean({ virtuals: true }),
    Comment.countDocuments(filter),
    Comment.aggregate<{ _id: CommentStatus; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  return sendSuccess(res, comments, {
    meta: {
      ...buildPageMeta(total, page, limit),
      statusCounts: Object.fromEntries(counts.map((item) => [item._id, item.count])),
    },
  });
});

/** PATCH /api/admin/comments/:id/status */
export const updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه نظر');
  const { status } = req.body as { status: CommentStatus };
  const allowed: CommentStatus[] = ['pending', 'approved', 'rejected', 'spam'];
  if (!allowed.includes(status)) throw ApiError.badRequest('وضعیت انتخاب شده معتبر نیست');

  const comment = await Comment.findById(req.params.id);
  if (!comment) throw ApiError.notFound('نظر مورد نظر یافت نشد');

  comment.status = status;
  comment.moderatedBy = req.user?._id as never;
  comment.moderatedAt = new Date();
  await comment.save();

  await recalcCommentsCount(comment.article);

  return sendSuccess(res, { id: comment.id, status: comment.status }, { message: 'وضعیت نظر تغییر کرد' });
});

/** POST /api/admin/comments/bulk */
export const bulkAction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { ids, action } = req.body as {
    ids: string[];
    action: 'approve' | 'reject' | 'spam' | 'delete';
  };
  if (!Array.isArray(ids) || ids.length === 0) throw ApiError.badRequest('هیچ نظری انتخاب نشده است');
  ids.forEach((id) => assertObjectId(id, 'شناسه نظر'));

  const affectedArticles = await Comment.distinct('article', { _id: { $in: ids } });

  if (action === 'delete') {
    const result = await Comment.deleteMany({ _id: { $in: ids } });
    await Promise.all(affectedArticles.map(recalcCommentsCount));
    return sendSuccess(res, { deleted: result.deletedCount }, { message: 'نظرهای انتخاب شده حذف شدند' });
  }

  const statusMap = { approve: 'approved', reject: 'rejected', spam: 'spam' } as const;
  const status = statusMap[action];
  if (!status) throw ApiError.badRequest('عملیات انتخاب شده معتبر نیست');

  const result = await Comment.updateMany(
    { _id: { $in: ids } },
    { $set: { status, moderatedBy: req.user?._id, moderatedAt: new Date() } },
  );
  await Promise.all(affectedArticles.map(recalcCommentsCount));

  return sendSuccess(res, { modified: result.modifiedCount }, { message: 'عملیات با موفقیت انجام شد' });
});

/** PUT /api/admin/comments/:id/reply — public reply published under the comment. */
export const reply = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه نظر');
  const { adminReply, status } = req.body as { adminReply: string; status?: CommentStatus };

  const comment = await Comment.findById(req.params.id);
  if (!comment) throw ApiError.notFound('نظر مورد نظر یافت نشد');

  comment.adminReply = adminReply;
  comment.moderatedBy = req.user?._id as never;
  comment.moderatedAt = new Date();
  if (status) comment.status = status;
  await comment.save();

  await recalcCommentsCount(comment.article);
  return sendSuccess(res, comment, { message: 'پاسخ ثبت شد' });
});

/** PUT /api/admin/comments/:id — edit comment content. */
export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه نظر');
  const { content } = req.body as { content: string };

  const comment = await Comment.findById(req.params.id);
  if (!comment) throw ApiError.notFound('نظر مورد نظر یافت نشد');

  comment.content = content;
  comment.isEdited = true;
  await comment.save();

  return sendSuccess(res, comment, { message: 'نظر ویرایش شد' });
});

/** DELETE /api/admin/comments/:id */
export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه نظر');
  const comment = await Comment.findByIdAndDelete(req.params.id);
  if (!comment) throw ApiError.notFound('نظر مورد نظر یافت نشد');

  await Comment.deleteMany({ parent: comment._id });
  await recalcCommentsCount(comment.article);

  return sendSuccess(res, { id: req.params.id }, { message: 'نظر حذف شد' });
});