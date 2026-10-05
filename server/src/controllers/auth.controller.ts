import { Response } from 'express';
import { AuthRequest, signToken } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/respond.js';

interface PublicUserInput {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar?: string;
  bio?: string;
  slug?: string;
  lastLoginAt?: Date;
  createdAt?: Date;
}

const publicUser = (user: PublicUserInput) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  avatar: user.avatar,
  bio: user.bio,
  slug: user.slug,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('ایمیل یا رمز عبور اشتباه است');
  }
  if (user.status === 'suspended') {
    throw ApiError.forbidden('حساب کاربری شما غیرفعال شده است');
  }
  if (user.status !== 'active') {
    throw ApiError.forbidden('حساب کاربری شما هنوز تأیید نشده است');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  return sendSuccess(res, { token: signToken(user), user: publicUser(user) }, { message: 'خوش آمدید' });
});

/** POST /api/auth/register — public sign-up creates a subscriber account. */
export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, password } = req.body as { name: string; email: string; password: string };

  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) throw ApiError.conflict('این ایمیل قبلاً ثبت شده است');

  const user = await User.create({ name, email, password, role: 'subscriber', status: 'active' });

  return sendSuccess(res, { token: signToken(user), user: publicUser(user) }, { status: 201, message: 'ثبت‌نام با موفقیت انجام شد' });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  return sendSuccess(res, publicUser(req.user));
});

/** PUT /api/auth/me — profile update for the signed-in user. */
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) throw ApiError.unauthorized();

  const { name, bio, avatar } = req.body as { name?: string; bio?: string; avatar?: string };
  if (name !== undefined) user.name = name;
  if (bio !== undefined) user.bio = bio;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();
  return sendSuccess(res, publicUser(user), { message: 'پروفایل به‌روزرسانی شد' });
});

/** PUT /api/auth/password */
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const user = await User.findById(req.user?.id).select('+password');
  if (!user) throw ApiError.unauthorized();

  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('رمز عبور فعلی صحیح نیست');
  }

  user.password = newPassword;
  await user.save();
  return sendSuccess(res, null, { message: 'رمز عبور با موفقیت تغییر کرد' });
});