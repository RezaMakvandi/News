export type SettingGroup =
  | 'general'
  | 'social'
  | 'seo'
  | 'footer'
  | 'content'
  | 'appearance'
  | 'shop'
  | 'payment'
  | 'mail';

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
  /** Mailbox replies to contact messages are sent from. */
  adminEmail?: string;
  mailFromName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  seoTitle?: string;
  seoKeywords?: string[];
  footerText?: string;
  commentsEnabled?: boolean;
  commentsModeration?: boolean;
  postsPerPage?: number;
  breakingEnabled?: boolean;
  /** Master switch for the storefront; hides all shop surfaces when false. */
  shopEnabled?: boolean;
  themeDefault?: 'light' | 'dark';
  accentColor?: string;
  /** Ordered home page blocks (see `home-layout.model`). */
  homeLayout?: unknown;
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
  mail: 'ایمیل و پاسخ به پیامها',
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
  'mail',
];

/** Keys rendered as toggles rather than text inputs. */
export const SETTING_BOOLEAN_KEYS = new Set([
  'commentsEnabled',
  'commentsModeration',
  'breakingEnabled',
  'shopEnabled',
  'codEnabled',
  'zarinpalSandbox',
  'smtpSecure',
]);

/** Keys that hold a colour value. */
export const SETTING_COLOR_KEYS = new Set(['accentColor']);

/** Keys rendered as password inputs (values are masked, never echoed back). */
export const SETTING_SECRET_KEYS = new Set(['smtpPass']);

/** Keys edited by a dedicated screen, hidden from the generic settings form. */
export const SETTING_MANAGED_KEYS = new Set(['homeLayout']);

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
