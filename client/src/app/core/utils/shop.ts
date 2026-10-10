import { faNumber } from './format';

/** Final payable price for a product-like object (respects sale + discount). */
export function finalPrice(product: {
  price: number;
  salePrice?: number;
  discountPercent?: number;
  finalPrice?: number;
}): number {
  if (typeof product.finalPrice === 'number' && product.finalPrice > 0) return product.finalPrice;
  if (product.salePrice && product.salePrice > 0 && product.salePrice < product.price)
    return product.salePrice;
  if (product.discountPercent && product.discountPercent > 0) {
    return Math.round(product.price * (1 - product.discountPercent / 100));
  }
  return product.price;
}

/** Effective discount percent for badges. */
export function discountPercent(product: {
  price: number;
  salePrice?: number;
  discountPercent?: number;
  effectiveDiscount?: number;
}): number {
  if (typeof product.effectiveDiscount === 'number' && product.effectiveDiscount > 0) {
    return Math.round(product.effectiveDiscount);
  }
  const final = finalPrice(product);
  if (final > 0 && final < product.price) {
    return Math.round(((product.price - final) / product.price) * 100);
  }
  return 0;
}

/** Formats a Toman amount with the «تومان» suffix, e.g. «۱۲٬۵۰۰ تومان». */
export function toman(value: number | null | undefined): string {
  if (value === null || value === undefined) return '۰ تومان';
  return `${faNumber(Math.round(value))} تومان`;
}

/** Same as `toman` but omits the currency suffix. */
export function tomanPlain(value: number | null | undefined): string {
  return faNumber(Math.round(value ?? 0));
}

export function asBrand(
  value: unknown,
): { _id: string; name: string; slug: string; logo?: string } | null {
  return typeof value === 'object' && value !== null
    ? (value as { _id: string; name: string; slug: string; logo?: string })
    : null;
}

export function asProductCategory(value: unknown): {
  _id: string;
  name: string;
  slug: string;
  color?: string;
  icon?: string;
} | null {
  return typeof value === 'object' && value !== null
    ? (value as { _id: string; name: string; slug: string; color?: string; icon?: string })
    : null;
}

export function brandName(value: unknown): string {
  return asBrand(value)?.name ?? '';
}

export function productCategoryName(value: unknown): string {
  return asProductCategory(value)?.name ?? 'دستهبندی نشده';
}

/** Star rating as an array of 'full' | 'half' | 'empty' buckets for rendering. */
export function stars(rating: number): ('full' | 'half' | 'empty')[] {
  const result: ('full' | 'half' | 'empty')[] = [];
  for (let i = 1; i <= 5; i += 1) {
    if (rating >= i) result.push('full');
    else if (rating >= i - 0.5) result.push('half');
    else result.push('empty');
  }
  return result;
}

/** Iranian provinces for the checkout address form. */
export const IRAN_PROVINCES = [
  'آذربایجان شرقی',
  'آذربایجان غربی',
  'اردبیل',
  'اصفهان',
  'البرز',
  'ایلام',
  'بوشهر',
  'تهران',
  'چهارمحال و بختیاری',
  'خراسان جنوبی',
  'خراسان رضوی',
  'خراسان شمالی',
  'خوزستان',
  'زنجان',
  'سمنان',
  'سیستان و بلوچستان',
  'فارس',
  'قزوین',
  'قم',
  'کردستان',
  'کرمان',
  'کرمانشاه',
  'کهگیلویه و بویراحمد',
  'گلستان',
  'گیلان',
  'لرستان',
  'مازندران',
  'مرکزی',
  'هرمزگان',
  'همدان',
  'یزد',
];
