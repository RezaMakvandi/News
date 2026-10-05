import { ApiError } from './ApiError.js';

export const toPersianDigits = (input: string | number): string =>
  String(input).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);

/** Seeds a Persian-friendly, URL-safe slug. */
export const slugify = (input: string, fallback = 'item'): string => {
  const base = (input || '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return base || `${fallback}-${Date.now().toString(36)}`;
};

export const escapeRegex = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type Numeric = number | string | undefined | null;

/** Shared helper for `page` / `limit` query params. */
export const parsePagination = (page: Numeric, limit: Numeric, maxLimit = 60) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(maxLimit, Math.max(1, Number(limit) || 12));
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};

export const buildPageMeta = (total: number, page: number, limit: number) => ({
  total,
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(total / limit)),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

/** Very small HTML sanitizer — keeps a safe subset of formatting tags. */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'blockquote',
  'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'figure', 'figcaption', 'hr',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'code', 'pre', 'span', 'div', 'iframe',
]);

const ALLOWED_ATTRS = new Set(['href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'class', 'style']);

export const sanitizeHtml = (html: string): string => {
  if (!html) return '';

  let output = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*>/gi, '')
    .replace(/javascript:/gi, '');

  output = output.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (match, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';

    const isClosing = match.startsWith('</');
    const selfClosing = ['br', 'hr', 'img'].includes(tag);
    if (isClosing) return selfClosing ? '' : `</${tag}>`;

    const attrs: string[] = [];
    const attrRegex = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(rawAttrs))) {
      const name = attrMatch[1].toLowerCase();
      const value = (attrMatch[3] ?? attrMatch[4] ?? '').trim();
      if (!ALLOWED_ATTRS.has(name)) continue;
      if (/^\s*(javascript|data:text\/html)/i.test(value)) continue;
      attrs.push(`${name}="${value.replace(/"/g, '&quot;')}"`);
    }

    const attrString = attrs.length ? ` ${attrs.join(' ')}` : '';
    return selfClosing ? `<${tag}${attrString} />` : `<${tag}${attrString}>`;
  });

  return output.trim();
};

export const stripHtml = (html: string): string =>
  (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const excerptFrom = (html: string, maxLength = 180): string => {
  const text = stripHtml(html);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
};

export const readingTimeOf = (html: string): number =>
  Math.max(1, Math.round(stripHtml(html).split(/\s+/).filter(Boolean).length / 200));

export const assertObjectId = (value: string, label = 'شناسه'): void => {
  if (!/^[0-9a-fA-F]{24}$/.test(value || '')) {
    throw ApiError.badRequest(`${label} نامعتبر است`);
  }
};

/** Removes undefined/empty values from a plain object so updates stay partial. */
export const compact = <T extends Record<string, unknown>>(input: T): Partial<T> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    result[key] = value;
  }
  return result as Partial<T>;
};