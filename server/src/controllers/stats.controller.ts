import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { Article } from '../models/Article.js';
import { Category } from '../models/Category.js';
import { Comment } from '../models/Comment.js';
import { Media } from '../models/Media.js';
import { Message } from '../models/Message.js';
import { Subscriber } from '../models/Subscriber.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/ApiError.js';
import { toPersianDigits } from '../utils/helpers.js';
import { sendSuccess } from '../utils/respond.js';

const startOfDay = (offsetDays = 0) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - offsetDays);
  return date;
};

/** GET /api/admin/stats/overview */
export const overview = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [
    articles, published, drafts, pending, users, comments, pendingComments,
    subscribers, unreadMessages, mediaCount, viewsAgg,
  ] = await Promise.all([
    Article.countDocuments(),
    Article.countDocuments({ status: 'published' }),
    Article.countDocuments({ status: 'draft' }),
    Article.countDocuments({ status: 'pending' }),
    User.countDocuments(),
    Comment.countDocuments(),
    Comment.countDocuments({ status: 'pending' }),
    Subscriber.countDocuments({ isActive: true }),
    Message.countDocuments({ status: 'unread' }),
    Media.countDocuments(),
    Article.aggregate<{ totalViews: number; totalLikes: number }>([
      { $group: { _id: null, totalViews: { $sum: '$views' }, totalLikes: { $sum: '$likes' } } },
    ]),
  ]);

  return sendSuccess(res, {
    articles: { total: articles, published, drafts, pending },
    users,
    comments: { total: comments, pending: pendingComments },
    subscribers,
    messages: { unread: unreadMessages },
    media: mediaCount,
    views: viewsAgg[0]?.totalViews ?? 0,
    likes: viewsAgg[0]?.totalLikes ?? 0,
  });
});

/** GET /api/admin/stats/charts */
export const charts = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const days = 14;
  const since = startOfDay(days - 1);

  const [viewsByDay, articlesByDay, commentsByDay, topArticles, categoryStats, topAuthors] = await Promise.all([
    Article.aggregate([
      { $match: { publishedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$publishedAt' } },
          views: { $sum: '$views' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Article.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Comment.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Article.find({ status: 'published' })
      .sort({ views: -1 })
      .limit(8)
      .select('title slug views likes commentsCount cover publishedAt')
      .populate('category', 'name slug color')
      .lean(),
    Article.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          views: { $sum: '$views' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    ]),
    Article.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$author', count: { $sum: 1 }, views: { $sum: '$views' } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'author' } },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          count: 1,
          views: 1,
          'author.name': 1,
          'author.slug': 1,
          'author.avatar': 1,
        },
      },
    ]),
  ]);

  const series = Array.from({ length: days }).map((_, index) => {
    const date = startOfDay(days - 1 - index);
    const key = date.toISOString().slice(0, 10);
    const views = viewsByDay.find((item) => item._id === key);
    return {
      date: key,
      label: date.toLocaleDateString('fa-IR', { day: '2-digit', month: '2-digit' }),
      views: views?.views ?? 0,
      published: views?.count ?? 0,
      created: articlesByDay.find((item) => item._id === key)?.count ?? 0,
      comments: commentsByDay.find((item) => item._id === key)?.count ?? 0,
    };
  });

  return sendSuccess(res, { series, topArticles, categoryStats, topAuthors });
});

/** GET /api/admin/stats/recent — dashboard activity feed. */
export const recent = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [articles, comments, messages] = await Promise.all([
    Article.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select('title slug status createdAt views cover')
      .populate('author', 'name avatar')
      .populate('category', 'name color slug')
      .lean(),
    Comment.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select('authorName content status createdAt')
      .populate('article', 'title slug')
      .lean(),
    Message.find().sort({ createdAt: -1 }).limit(5).select('name subject status createdAt').lean(),
  ]);

  return sendSuccess(res, { articles, comments, messages });
});