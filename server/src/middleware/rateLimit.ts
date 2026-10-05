import rateLimit from 'express-rate-limit';

const message = { success: false, message: 'تعداد درخواست‌های شما زیاد بوده است. لطفاً کمی بعد تلاش کنید.' };

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'تلاش‌های ورود بیش از حد مجاز. لطفاً ۱۰ دقیقه بعد تلاش کنید.' },
});

export const publicWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'تعداد ارسال‌ها زیاد بوده است. لطفاً چند دقیقه بعد تلاش کنید.' },
});