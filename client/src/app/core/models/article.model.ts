import type { CategoryRef } from './taxonomy.model';
import type { AuthorRef } from './user.model';

export type ArticleStatus = 'draft' | 'pending' | 'published' | 'archived';
export type ArticleType = 'news' | 'article' | 'review' | 'video' | 'gallery';

export interface ArticleImage {
  url: string;
  alt?: string;
  caption?: string;
}

export interface ArticleSeo {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
}

export interface ArticleSource {
  name?: string;
  url?: string;
}

export interface TagRef {
  _id: string;
  name: string;
  slug: string;
}

export interface Article {
  _id: string;
  id?: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  cover?: string;
  coverAlt?: string;
  gallery?: ArticleImage[];
  status: ArticleStatus;
  type: ArticleType;
  category: CategoryRef | string;
  tags: (TagRef | string)[];
  author: AuthorRef | string;
  isBreaking: boolean;
  isFeatured: boolean;
  isPinned: boolean;
  allowComments: boolean;
  views: number;
  likes: number;
  shares: number;
  commentsCount: number;
  readingTime: number;
  seo?: ArticleSeo;
  source?: ArticleSource;
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Card-friendly projection returned by list endpoints. */
export interface ArticleCard {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  cover?: string;
  coverAlt?: string;
  type: ArticleType;
  status: ArticleStatus;
  category?: CategoryRef;
  author?: AuthorRef;
  views: number;
  likes: number;
  commentsCount: number;
  readingTime: number;
  isBreaking?: boolean;
  isFeatured?: boolean;
  isPinned?: boolean;
  publishedAt?: string;
  createdAt: string;
}

export interface HeadlinesResponse {
  hero: ArticleCard | null;
  breaking: ArticleCard[];
  featured: ArticleCard[];
  latest: ArticleCard[];
}

export interface ArticleDetailResponse {
  article: Article;
  related: ArticleCard[];
}

export interface NeighborsResponse {
  prev: { title: string; slug: string; cover?: string } | null;
  next: { title: string; slug: string; cover?: string } | null;
}

/** Payload accepted by the admin create/update endpoints. */
export interface ArticlePayload {
  title: string;
  content: string;
  summary?: string;
  cover?: string;
  coverAlt?: string;
  gallery?: ArticleImage[];
  status?: ArticleStatus;
  type?: ArticleType;
  category: string;
  tags?: string[];
  author?: string;
  isBreaking?: boolean;
  isFeatured?: boolean;
  isPinned?: boolean;
  allowComments?: boolean;
  seo?: ArticleSeo;
  source?: ArticleSource;
  scheduledAt?: string | null;
  publishedAt?: string | null;
}

export interface ArticleQuery {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  q?: string;
  author?: string;
  type?: string;
  featured?: boolean;
  breaking?: boolean;
  status?: string;
  sort?: string;
}

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'پیش‌نویس',
  pending: 'در انتظار تأیید',
  published: 'منتشر شده',
  archived: 'بایگانی',
};

export const ARTICLE_TYPE_LABELS: Record<ArticleType, string> = {
  news: 'خبر',
  article: 'مقاله',
  review: 'بررسی',
  video: 'ویدیو',
  gallery: 'گالری تصاویر',
};

export const ARTICLE_STATUS_TONE: Record<ArticleStatus, string> = {
  draft: 'badge',
  pending: 'badge badge-warning',
  published: 'badge badge-success',
  archived: 'badge badge-danger',
};