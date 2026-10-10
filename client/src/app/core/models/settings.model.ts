export type SettingGroup =
  | 'general'
  | 'social'
  | 'seo'
  | 'footer'
  | 'content'
  | 'appearance'
  | 'shop'
  | 'payment';

export interface SettingItem {
  key: string;
  value: unknown;
  label: string;
  group: SettingGroup;
  _id?: string;
}

/** Public settings map — keys are flat, values are unknown-typed. */
export interface PublicSettings {
  siteName?: string;
  siteTagline?: string;
  siteDescription?: string;
  siteLogo?: string;
  siteFavicon?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  socialInstagram?: string;
  socialTwitter?: string;
  socialTelegram?: string;
  socialYoutube?: string;
  socialLinkedin?: string;
  seoTitle?: string;
  seoKeywords?: string[];
  footerText?: string;
  commentsEnabled?: boolean;
  commentsModeration?: boolean;
  postsPerPage?: number;
  breakingEnabled?: boolean;
  themeDefault?: 'light' | 'dark';
  accentColor?: string;
  [key: string]: unknown;
}

export interface AdminSettingsResponse {
  items: SettingItem[];
  grouped: Record<string, { key: string; value: unknown; label: string }[]>;
}

export const SETTING_GROUP_LABELS: Record<SettingGroup, string> = {
  general: 'تنظیمات عمومی',
  social: 'شبکه‌های اجتماعی',
  seo: 'سئو',
  footer: 'پاورقی',
  content: 'محتوا و نظرات',
  appearance: 'ظاهر و قالب',
  shop: 'فروشگاه',
  payment: 'درگاه پرداخت زرین‌پال',
};

export const SETTING_GROUP_ORDER: SettingGroup[] = [
  'general',
  'appearance',
  'content',
  'social',
  'seo',
  'footer',
  'shop',
  'payment',
];

/** Keys rendered as toggles rather than text inputs. */
export const SETTING_BOOLEAN_KEYS = new Set([
  'commentsEnabled',
  'commentsModeration',
  'breakingEnabled',
  'shopEnabled',
  'codEnabled',
  'zarinpalSandbox',
]);

/** Keys that hold a colour value. */
export const SETTING_COLOR_KEYS = new Set(['accentColor']);

export interface Page {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  isPublished: boolean;
  showInFooter: boolean;
  order: number;
  seo?: { title?: string; description?: string; keywords?: string[] };
  createdAt?: string;
  updatedAt?: string;
}

export interface PagePayload {
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  isPublished?: boolean;
  showInFooter?: boolean;
  order?: number;
  seo?: { title?: string; description?: string; keywords?: string[] };
}

export interface Subscriber {
  _id: string;
  email: string;
  name?: string;
  isActive: boolean;
  token: string;
  source: string;
  createdAt: string;
  updatedAt?: string;
}

export type MessageStatus = 'unread' | 'read' | 'replied' | 'archived';

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  body: string;
  status: MessageStatus;
  reply?: string;
  repliedBy?: string | null;
  repliedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  unread: 'خوانده نشده',
  read: 'خوانده شده',
  replied: 'پاسخ داده شده',
  archived: 'بایگانی',
};

export const MESSAGE_STATUS_TONE: Record<MessageStatus, string> = {
  unread: 'badge badge-warning',
  read: 'badge badge-info',
  replied: 'badge badge-success',
  archived: 'badge',
};
