import { Router } from 'express';
import * as articles from '../controllers/article.controller.js';
import * as categories from '../controllers/category.controller.js';
import * as comments from '../controllers/comment.controller.js';
import * as users from '../controllers/user.controller.js';
import * as media from '../controllers/media.controller.js';
import * as settings from '../controllers/settings.controller.js';
import * as tags from '../controllers/tag.controller.js';
import * as stats from '../controllers/stats.controller.js';
import { ADMIN_ROLES, STAFF_ROLES, attachUser, requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { isIn, isNonEmpty, maxLength, minLength, validateBody } from '../middleware/validate.js';

const router = Router();

router.use(attachUser, requireAuth, requireRole('admin', 'editor', 'author'));

/* ------------------------------- Articles ------------------------------ */
const articleValidators = {
  title: [isNonEmpty, minLength(5, 'عنوان'), maxLength(220, 'عنوان')],
  content: [isNonEmpty, minLength(20, 'متن خبر')],
  status: [isIn(['draft', 'pending', 'published', 'archived'], 'وضعیت')],
  type: [isIn(['news', 'article', 'review', 'video', 'gallery'], 'نوع خبر')],
};

router.get('/articles', articles.listForAdmin);
router.post('/articles/bulk', articles.bulkAction);
router.get('/articles/:id', articles.getForAdmin);
router.post(
  '/articles',
  validateBody({ title: articleValidators.title, content: articleValidators.content }),
  articles.create,
);
router.put('/articles/:id', articles.update);
router.patch('/articles/:id/status', articles.updateStatus);
router.delete('/articles/:id', articles.remove);

/* ------------------------------ Categories ----------------------------- */
router.get('/categories', categories.list);
router.post(
  '/categories',
  requireRole(...ADMIN_ROLES),
  validateBody({ name: [isNonEmpty, maxLength(80, 'نام')] }),
  categories.create,
);
router.post('/categories/reorder', requireRole(...ADMIN_ROLES), categories.reorder);
router.put('/categories/:id', requireRole(...ADMIN_ROLES), categories.update);
router.delete('/categories/:id', requireRole(...ADMIN_ROLES), categories.remove);

/* --------------------------------- Tags -------------------------------- */
router.get('/tags', requireRole(...STAFF_ROLES), tags.list);
router.post('/tags', requireRole(...STAFF_ROLES), validateBody({ name: [isNonEmpty] }), tags.create);
router.put('/tags/:id', requireRole(...STAFF_ROLES), tags.update);
router.delete('/tags/:id', requireRole(...STAFF_ROLES), tags.remove);

/* ------------------------------- Comments ------------------------------ */
router.get('/comments', comments.list);
router.post('/comments/bulk', comments.bulkAction);
router.patch('/comments/:id/status', comments.updateStatus);
router.put('/comments/:id/reply', validateBody({ adminReply: [isNonEmpty, minLength(2, 'پاسخ')] }), comments.reply);
router.put('/comments/:id', validateBody({ content: [isNonEmpty, minLength(3, 'متن نظر')] }), comments.update);
router.delete('/comments/:id', comments.remove);

/* -------------------------------- Users -------------------------------- */
router.get('/users', requireRole(...ADMIN_ROLES), users.list);
router.get('/users/:id', requireRole(...ADMIN_ROLES), users.getOne);
router.post(
  '/users',
  requireRole(...ADMIN_ROLES),
  validateBody({
    name: [isNonEmpty, minLength(3, 'نام')],
    email: [isNonEmpty],
    password: [isNonEmpty, minLength(6, 'رمز عبور')],
    role: [isIn(['admin', 'editor', 'author', 'subscriber'], 'سطح دسترسی')],
  }),
  users.create,
);
router.put('/users/:id', requireRole(...ADMIN_ROLES), users.update);
router.patch('/users/:id/status', requireRole(...ADMIN_ROLES), users.updateStatus);
router.delete('/users/:id', requireRole(...ADMIN_ROLES), users.remove);

/* -------------------------------- Media -------------------------------- */
router.get('/media', media.list);
router.post('/media', upload.array('files', 12), media.uploadFiles);
router.put('/media/:id', media.update);
router.delete('/media/:id', media.remove);

/* ------------------------------ Settings ------------------------------- */
router.get('/settings', requireRole(...ADMIN_ROLES), settings.getAdmin);
router.put('/settings', requireRole(...ADMIN_ROLES), settings.updateMany);

/* -------------------------------- Pages -------------------------------- */
router.post(
  '/pages',
  requireRole(...ADMIN_ROLES),
  validateBody({ title: [isNonEmpty], content: [isNonEmpty] }),
  settings.createPage,
);
router.put('/pages/:id', requireRole(...ADMIN_ROLES), settings.updatePage);
router.delete('/pages/:id', requireRole(...ADMIN_ROLES), settings.removePage);

/* ----------------------------- Subscribers ----------------------------- */
router.get('/subscribers', requireRole(...ADMIN_ROLES), settings.listSubscribers);
router.put('/subscribers/:id', requireRole(...ADMIN_ROLES), settings.updateSubscriber);
router.delete('/subscribers/:id', requireRole(...ADMIN_ROLES), settings.removeSubscriber);

/* ------------------------------- Messages ------------------------------ */
router.get('/messages', settings.listMessages);
router.put('/messages/:id', settings.updateMessage);
router.delete('/messages/:id', requireRole(...ADMIN_ROLES), settings.removeMessage);

/* -------------------------------- Stats -------------------------------- */
router.get('/stats/overview', stats.overview);
router.get('/stats/charts', stats.charts);
router.get('/stats/recent', stats.recent);

export default router;