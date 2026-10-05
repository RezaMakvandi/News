import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { Page } from '../models/Page.js';
import { Setting } from '../models/Setting.js';
import { Subscriber } from '../models/Subscriber.js';
import { Message, MessageStatus } from '../models/Message.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { assertObjectId, buildPageMeta, escapeRegex, parsePagination, sanitizeHtml, slugify } from '../utils/helpers.js';
import { sendSuccess } from '../utils/respond.js';

export const DEFAULT_SETTINGS: Record<string, { value: unknown; group: string; label: string }> = {
  siteName: { value: 'زوم‌آیتی', group: 'general', label: 'نام سایت' },
  siteTagline: { value: 'اخبار فناوری، علم و بازی', group: 'general', label: 'شعار سایت' },
  siteDescription: {
    value: 'رسانه‌ای مستقل برای پوشش اخبار فناوری، علمی، خودرو، بازی و فضای مجازی به زبان فارسی.',
    group: 'general',
    label: 'توضیح سایت',
  },
  siteLogo: { value: '', group: 'general', label: 'لوگوی سایت' },
  siteFavicon: { value: '', group: 'general', label: 'فاوآیکون' },
  contactEmail: { value: 'info@example.com', group: 'general', label: 'ایمیل تماس' },
  contactPhone: { value: '۰۲۱-۱۲۳۴۵۶۷۸', group: 'general', label: 'تلفن تماس' },
  address: { value: 'تهران، خیابان آزادی، پلاک ۱۲', group: 'general', label: 'نشانی' },
  socialInstagram: { value: 'https://instagram.com/', group: 'social', label: 'اینستاگرام' },
  socialTwitter: { value: 'https://x.com/', group: 'social', label: 'ایکس (توییتر)' },
  socialTelegram: { value: 'https://telegram.org/', group: 'social', label: 'تلگرام' },
  socialYoutube: { value: 'https://youtube.com/', group: 'social', label: 'یوتیوب' },
  socialLinkedin: { value: '', group: 'social', label: 'لینکدین' },
  seoTitle: { value: 'زوم‌آیتی | اخبار فناوری', group: 'seo', label: 'عنوان پیش‌فرض سئو' },
  seoKeywords: { value: ['فناوری', 'اخبار', 'موبایل', 'بازی'], group: 'seo', label: 'کلمات کلیدی' },
  footerText: {
    value: 'استفاده از مطالب این سایت با ذکر منبع آزاد است.',
    group: 'footer',
    label: 'متن پاورقی',
  },
  commentsEnabled: { value: true, group: 'content', label: 'فعال بودن نظرات' },
  commentsModeration: { value: true, group: 'content', label: 'تأیید دستی نظرات' },
  postsPerPage: { value: 12, group: 'content', label: 'تعداد خبرها در هر صفحه' },
  breakingEnabled: { value: true, group: 'content', label: 'نمایش نوار خبر فوری' },
  themeDefault: { value: 'light', group: 'appearance', label: 'حالت پیش‌فرض نمایش' },
  accentColor: { value: '#2563eb', group: 'appearance', label: 'رنگ اصلی' },
};

/** GET /api/settings — public settings map. */
export const getPublic = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const settings = await Setting.find({ group: { $in: ['general', 'social', 'seo', 'footer', 'content', 'appearance'] } }).lean();
  const map = Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([key, item]) => [key, item.value]));
  settings.forEach((item) => {
    map[item.key] = item.value;
  });
  return sendSuccess(res, map);
});

/** GET /api/admin/settings — grouped settings, seeding defaults on first run. */
export const getAdmin = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const existing = await Setting.find().lean();
  const existingKeys = new Set(existing.map((item) => item.key));

  const missing = Object.entries(DEFAULT_SETTINGS)
    .filter(([key]) => !existingKeys.has(key))
    .map(([key, item]) => ({ key, ...item }));

  if (missing.length > 0) {
    await Setting.insertMany(missing);
  }

  const settings = await Setting.find().sort({ group: 1, key: 1 }).lean();
  const grouped = settings.reduce<Record<string, unknown[]>>((acc, item) => {
    acc[item.group] = acc[item.group] ?? [];
    acc[item.group].push({ key: item.key, value: item.value, label: item.label });
    return acc;
  }, {});

  return sendSuccess(res, { items: settings, grouped });
});

/** PUT /api/admin/settings */
export const updateMany = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { items } = req.body as { items: { key: string; value: unknown }[] };
  if (!Array.isArray(items) || items.length === 0) throw ApiError.badRequest('تنظیماتی برای ذخیره ارسال نشده است');

  await Setting.bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: { key: item.key },
        update: {
          $set: { value: item.value },
          $setOnInsert: {
            group: DEFAULT_SETTINGS[item.key]?.group ?? 'general',
            label: DEFAULT_SETTINGS[item.key]?.label ?? '',
          },
        },
        upsert: true,
      },
    })),
  );

  const settings = await Setting.find().lean();
  return sendSuccess(res, Object.fromEntries(settings.map((item) => [item.key, item.value])), {
    message: 'تنظیمات ذخیره شد',
  });
});

/* ------------------------------- Pages ------------------------------- */

/** GET /api/pages */
export const listPages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isAdmin = Boolean(req.user);
  const pages = await Page.find(isAdmin ? {} : { isPublished: true }).sort({ order: 1, title: 1 }).lean();
  return sendSuccess(res, pages);
});

/** GET /api/pages/:slug */
export const getPage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = await Page.findOne({ slug: req.params.slug }).lean();
  if (!page) throw ApiError.notFound('صفحه یافت نشد');
  if (!page.isPublished && !req.user) throw ApiError.notFound('صفحه یافت نشد');
  return sendSuccess(res, page);
});

/** POST /api/admin/pages */
export const createPage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, content, excerpt, isPublished, showInFooter, order, seo } = req.body as Record<string, any>;
  const page = await Page.create({
    title,
    slug: slugify(String(req.body.slug || title), 'page'),
    content: sanitizeHtml(content),
    excerpt,
    isPublished,
    showInFooter,
    order,
    seo,
  });
  return sendSuccess(res, page, { status: 201, message: 'صفحه ایجاد شد' });
});

/** PUT /api/admin/pages/:id */
export const updatePage = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه صفحه');
  const page = await Page.findById(req.params.id);
  if (!page) throw ApiError.notFound('صفحه یافت نشد');

  const body = req.body as Record<string, any>;
  if (body.title) page.title = body.title;
  if (body.slug && body.slug !== page.slug) page.slug = slugify(body.slug, 'page');
  if (body.content !== undefined) page.content = sanitizeHtml(body.content);
  if (body.excerpt !== undefined) page.excerpt = body.excerpt;
  if (body.isPublished !== undefined) page.isPublished = Boolean(body.isPublished);
  if (body.showInFooter !== undefined) page.showInFooter = Boolean(body.showInFooter);
  if (body.order !== undefined) page.order = body.order;
  if (body.seo !== undefined) page.seo = body.seo;

  await page.save();
  return sendSuccess(res, page, { message: 'صفحه به‌روزرسانی شد' });
});

/** DELETE /api/admin/pages/:id */
export const removePage = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه صفحه');
  const page = await Page.findByIdAndDelete(req.params.id);
  if (!page) throw ApiError.notFound('صفحه یافت نشد');
  return sendSuccess(res, { id: req.params.id }, { message: 'صفحه حذف شد' });
});

/* ---------------------------- Subscribers ---------------------------- */

/** POST /api/subscribers — newsletter signup. */
export const subscribe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, name } = req.body as { email: string; name?: string };
  const normalized = email.toLowerCase().trim();

  const existing = await Subscriber.findOne({ email: normalized });
  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save();
      return sendSuccess(res, null, { message: 'عضویت شما دوباره فعال شد' });
    }
    return sendSuccess(res, null, { message: 'شما قبلاً عضو خبرنامه شده‌اید' });
  }

  await Subscriber.create({ email: normalized, name, token: Math.random().toString(36).slice(2, 12) });
  return sendSuccess(res, null, { status: 201, message: 'عضویت شما در خبرنامه ثبت شد' });
});

/** GET /api/admin/subscribers */
export const listSubscribers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query.page as string, req.query.limit as string, 200);
  const { q, active } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (active === 'true') filter.isActive = true;
  if (active === 'false') filter.isActive = false;
  if (q) filter.$or = [{ email: { $regex: escapeRegex(q), $options: 'i' } }, { name: { $regex: escapeRegex(q), $options: 'i' } }];

  const [items, total] = await Promise.all([
    Subscriber.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Subscriber.countDocuments(filter),
  ]);

  return sendSuccess(res, items, { meta: buildPageMeta(total, page, limit) });
});

/** PUT /api/admin/subscribers/:id */
export const updateSubscriber = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه مشترک');
  const { isActive, name } = req.body as { isActive?: boolean; name?: string };

  const subscriber = await Subscriber.findByIdAndUpdate(
    req.params.id,
    { $set: { ...(isActive !== undefined ? { isActive } : {}), ...(name !== undefined ? { name } : {}) } },
    { new: true },
  );
  if (!subscriber) throw ApiError.notFound('مشترک یافت نشد');

  return sendSuccess(res, subscriber, { message: 'اطلاعات مشترک به‌روزرسانی شد' });
});

/** DELETE /api/admin/subscribers/:id */
export const removeSubscriber = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه مشترک');
  const subscriber = await Subscriber.findByIdAndDelete(req.params.id);
  if (!subscriber) throw ApiError.notFound('مشترک یافت نشد');
  return sendSuccess(res, { id: req.params.id }, { message: 'مشترک حذف شد' });
});

/* ------------------------------ Messages ----------------------------- */

/** POST /api/messages — contact form. */
export const createMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, phone, subject, body } = req.body as Record<string, string>;
  await Message.create({ name, email, phone, subject, body });
  return sendSuccess(res, null, { status: 201, message: 'پیام شما ارسال شد. به‌زودی پاسخ می‌دهیم.' });
});

/** GET /api/admin/messages */
export const listMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query.page as string, req.query.limit as string, 100);
  const { status, q } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (status && status !== 'all') filter.status = status;
  if (q) {
    const regex = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ subject: regex }, { name: regex }, { email: regex }, { body: regex }];
  }

  const [items, total, unread] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Message.countDocuments(filter),
    Message.countDocuments({ status: 'unread' }),
  ]);

  return sendSuccess(res, items, { meta: { ...buildPageMeta(total, page, limit), unread } });
});

/** PUT /api/admin/messages/:id */
export const updateMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه پیام');
  const { status, reply } = req.body as { status?: MessageStatus; reply?: string };

  const update: Record<string, unknown> = {};
  if (status) update.status = status;
  if (reply !== undefined) {
    update.reply = reply;
    update.status = status ?? 'replied';
    update.repliedBy = req.user?._id;
    update.repliedAt = new Date();
  }

  const message = await Message.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!message) throw ApiError.notFound('پیام یافت نشد');

  return sendSuccess(res, message, { message: 'پیام به‌روزرسانی شد' });
});

/** DELETE /api/admin/messages/:id */
export const removeMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertObjectId(req.params.id, 'شناسه پیام');
  const message = await Message.findByIdAndDelete(req.params.id);
  if (!message) throw ApiError.notFound('پیام یافت نشد');
  return sendSuccess(res, { id: req.params.id }, { message: 'پیام حذف شد' });
});