import { Router } from 'express';
import * as articles from '../controllers/article.controller.js';
import { attachUser } from '../middleware/auth.js';
import { publicWriteLimiter } from '../middleware/rateLimit.js';
import {
  isEmail,
  isIn,
  isNonEmpty,
  maxLength,
  minLength,
  rejectMarkup,
  validateBody,
} from '../middleware/validate.js';

const router = Router();

router.use(attachUser);

router.get('/', articles.listPublished);
router.get('/headlines', articles.getHeadlines);
router.get('/popular', articles.getPopular);
router.get('/:slug', articles.getBySlug);
router.get('/:slug/neighbors', articles.getNeighbors);
router.post('/:slug/like', publicWriteLimiter, articles.likeArticle);
router.get('/:slug/comments', articles.listArticleComments);
router.post(
  '/:slug/comments',
  publicWriteLimiter,
  validateBody({
    content: [isNonEmpty, minLength(3, 'متن نظر'), maxLength(2000, 'متن نظر'), rejectMarkup('متن نظر')],
  }),
  articles.createComment,
);

export default router;