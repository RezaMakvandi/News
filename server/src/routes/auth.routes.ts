import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimit.js';
import { attachUser, requireAuth } from '../middleware/auth.js';
import { validateBody, isEmail, minLength, isNonEmpty } from '../middleware/validate.js';
import * as auth from '../controllers/auth.controller.js';

const router = Router();

router.post(
  '/login',
  authLimiter,
  validateBody({
    email: [isNonEmpty, isEmail],
    password: [isNonEmpty, minLength(6, 'رمز عبور')],
  }),
  auth.login,
);

router.post(
  '/register',
  authLimiter,
  validateBody({
    name: [isNonEmpty, minLength(3, 'نام')],
    email: [isNonEmpty, isEmail],
    password: [isNonEmpty, minLength(6, 'رمز عبور')],
  }),
  auth.register,
);

router.get('/me', attachUser, requireAuth, auth.me);
router.put('/me', attachUser, requireAuth, auth.updateProfile);
router.put(
  '/password',
  attachUser,
  requireAuth,
  validateBody({
    currentPassword: [isNonEmpty],
    newPassword: [isNonEmpty, minLength(6, 'رمز عبور جدید')],
  }),
  auth.changePassword,
);

export default router;