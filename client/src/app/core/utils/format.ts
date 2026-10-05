/** Persian date/number helpers shared by every component. */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Converts latin digits in a string to Persian digits. */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => FA_DIGITS[Number(digit)]);
}

const numberFormatter = new Intl.NumberFormat('fa-IR');

/** Formats a number with Persian digits and thousand separators. */
export function faNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '۰';
  return numberFormatter.format(value);
}

const dateFormatter = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const shortDateFormatter = new Intl.DateTimeFormat('fa-IR', {
  month: 'long',
  day: 'numeric',
});

/** Full Persian date, e.g. «۱۲ مهر ۱۴۰۴». */
export function faDate(value?: string | Date | null): string {
  const date = parse(value);
  return date ? dateFormatter.format(date) : '';
}

/** Persian date and time. */
export function faDateTime(value?: string | Date | null): string {
  const date = parse(value);
  return date ? dateTimeFormatter.format(date) : '';
}

/** Persian month and day without the year. */
export function faShortDate(value?: string | Date | null): string {
  const date = parse(value);
  return date ? shortDateFormatter.format(date) : '';
}

/** Relative time such as «۵ دقیقه پیش»، falling back to an absolute date. */
export function faRelativeTime(value?: string | Date | null): string {
  const date = parse(value);
  if (!date) return '';

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'لحظه‌ای پیش';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${faNumber(minutes)} دقیقه پیش`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${faNumber(hours)} ساعت پیش`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${faNumber(days)} روز پیش`;

  const months = Math.round(days / 30);
  if (months < 12) return `${faNumber(months)} ماه پیش`;

  return faDate(date);
}

/** ISO string for `<input type="datetime-local">`, in local time. */
export function toDateTimeLocal(value?: string | Date | null): string {
  const date = parse(value);
  if (!date) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** Rough reading time in minutes based on word count. */
export function estimateReadingTime(html: string): string {
  const text = html.replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return `${faNumber(Math.max(1, Math.round(words / 200)))} دقیقه`;
}

function parse(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}