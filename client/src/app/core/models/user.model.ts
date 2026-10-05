export type UserRole = 'admin' | 'editor' | 'author' | 'subscriber';
export type UserStatus = 'active' | 'pending' | 'suspended';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  bio?: string;
  slug?: string;
  postsCount?: number;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Signed-in identity returned by `/api/auth/*`. */
export interface AuthUser {
  /** Alias used by the admin table; the backend serialises this from `_id`. */
  _id?: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  bio?: string;
  slug?: string;
  postsCount?: number;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

/** Trimmed author projection embedded in article documents. */
export interface AuthorRef {
  _id: string;
  name: string;
  slug?: string;
  avatar?: string;
  bio?: string;
  role?: UserRole;
}

/** Public author profile returned by `GET /api/authors/:slug`. */
export interface AuthorProfile {
  _id: string;
  name: string;
  slug: string;
  avatar?: string;
  bio?: string;
  role?: UserRole;
  articlesCount: number;
}

export interface UserPayload {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status?: UserStatus;
  bio?: string;
  avatar?: string;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'مدیر کل',
  editor: 'سردبیر',
  author: 'نویسنده',
  subscriber: 'کاربر عادی',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'فعال',
  pending: 'در انتظار تأیید',
  suspended: 'غیرفعال',
};

export const USER_STATUS_TONE: Record<UserStatus, string> = {
  active: 'badge badge-success',
  pending: 'badge badge-warning',
  suspended: 'badge badge-danger',
};