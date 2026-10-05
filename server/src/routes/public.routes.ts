import { Router } from 'express';
import * as categories from '../controllers/category.controller.js';
import * as tags from '../controllers/tag.controller.js';
import * as pages from '../controllers/settings.controller.js';
import * as content from '../controllers/settings.controller.js';
import * as articleController from '../controllers/article.controller.js';
import * as users from '../controllers/user.controller.js';
import { attachUser } from '../middleware/auth.js';
import { publicWriteLimiter } from '../middleware/rateLimit.js';
import { isEmail, isIn, isNonEmpty, maxLength, minLength, rejectMarkup, validateBody } from '../middleware/validate.js';

/* ------------------------------ Categories ----------------------------- */
export const categoryRoutes = Router();
categoryRoutes.use(attachUser);
categoryRoutes.get('/', categories.list);
categoryRoutes.get('/:slug', categories.getBySlug);

/* -------------------------------- Tags --------------------------------- */
export const tagRoutes = Router();
tagRoutes.get('/', tags.list);
tagRoutes.get('/popular', tags.popular);

/* -------------------------------- Pages -------------------------------- */
export const pageRoutes = Router();
pageRoutes.use(attachUser);
pageRoutes.get('/', content.listPages);
pageRoutes.get('/:slug', content.getPage);

/* ---------------------------- Subscribers ------------------------------ */
export const subscriberRoutes = Router();
subscriberRoutes.post(
  '/',
  publicWriteLimiter,
  validateBody({ email: [isNonEmpty, isEmail] }),
  pages.subscribe,
);

/* ------------------------------ Messages ------------------------------- */
export const messageRoutes = Router();
messageRoutes.post(
  '/',
  publicWriteLimiter,
  validateBody({
    name: [isNonEmpty, minLength(3, 'نام'), maxLength(80, 'نام')],
    email: [isNonEmpty, isEmail],
    subject: [isNonEmpty, minLength(3, 'موضوع'), maxLength(200, 'موضوع'), rejectMarkup('موضوع')],
    body: [isNonEmpty, minLength(10, 'متن پیام'), maxLength(4000, 'متن پیام'), rejectMarkup('متن پیام')],
  }),
  pages.createMessage,
);

/* ------------------------------ Authors -------------------------------- */
export const authorRoutes = Router();
authorRoutes.get('/:slug', users.getPublicAuthor);

/* ------------------------- Comments (public vote) ---------------------- */
export const commentRoutes = Router();
commentRoutes.post(
  '/:id/vote',
  publicWriteLimiter,
  validateBody({ type: [isIn(['like', 'dislike'])] }),
    articleController.voteComment,
);