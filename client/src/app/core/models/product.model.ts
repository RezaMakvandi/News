export type ProductStatus = 'draft' | 'published' | 'archived';

export interface ProductImage {
  url: string;
  alt?: string;
}

export interface ProductVariant {
  name: string;
  value: string;
  priceDelta?: number;
  stock: number;
  sku?: string;
}

export interface ProductSpec {
  group: string;
  name: string;
  value: string;
}

/** Populated brand / category projections embedded on products. */
export interface BrandRef {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  country?: string;
}

export interface ProductCategoryRef {
  _id: string;
  name: string;
  slug: string;
  color?: string;
  icon?: string;
}

export interface Product {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  summary?: string;
  description: string;
  brand?: BrandRef | string | null;
  category: ProductCategoryRef | string;
  tags?: { _id: string; name: string; slug: string }[];
  images: ProductImage[];
  cover?: string;
  price: number;
  salePrice: number;
  discountPercent: number;
  stock: number;
  sku?: string;
  variants: ProductVariant[];
  specs: ProductSpec[];
  status: ProductStatus;
  isFeatured: boolean;
  isNewArrival: boolean;
  warranty?: string;
  shippingNote?: string;
  rating: number;
  ratingCount: number;
  soldCount: number;
  views: number;
  finalPrice?: number;
  effectiveDiscount?: number;
  seo?: { title?: string; description?: string; keywords?: string[] };
  createdAt: string;
  updatedAt: string;
}

/** Card projection used across product grids. */
export interface ProductCard {
  _id: string;
  name: string;
  slug: string;
  summary?: string;
  cover?: string;
  price: number;
  salePrice: number;
  discountPercent: number;
  stock: number;
  rating: number;
  ratingCount: number;
  soldCount: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  finalPrice?: number;
  effectiveDiscount?: number;
  brand?: BrandRef | null;
  category?: ProductCategoryRef | null;
  specs?: ProductSpec[];
  createdAt?: string;
}

export interface ProductDetailResponse {
  product: Product;
  related: ProductCard[];
  ratingHistogram: Record<string, number>;
  canReview: boolean;
}

export interface ProductFacets {
  priceRange: { min: number; max: number };
  brands: { _id: string; count: number; brand?: BrandRef }[];
  categories: { _id: string; count: number; category?: ProductCategoryRef }[];
}

export interface FeaturedProducts {
  featured: ProductCard[];
  latest: ProductCard[];
  bestSellers: ProductCard[];
  onSale: ProductCard[];
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  onSale?: boolean;
  rating?: number;
  sort?: string;
}

export interface ProductPayload {
  name: string;
  slug?: string;
  summary?: string;
  description?: string;
  brand?: string | null;
  category: string;
  tags?: string[];
  images?: ProductImage[];
  cover?: string;
  price: number;
  salePrice?: number;
  discountPercent?: number;
  stock?: number;
  sku?: string;
  variants?: ProductVariant[];
  specs?: ProductSpec[];
  status?: ProductStatus;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  warranty?: string;
  shippingNote?: string;
  seo?: { title?: string; description?: string; keywords?: string[] };
}

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  country?: string;
  isActive: boolean;
  showInMenu: boolean;
  order: number;
  productsCount?: number;
}

export interface ProductCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  cover?: string;
  parent?: string | null;
  order: number;
  isActive: boolean;
  showInMenu: boolean;
  productsCount?: number;
}

export interface ProductReview {
  _id: string;
  product: string | { _id: string; name: string; slug: string; cover?: string };
  user: { _id: string; name: string; avatar?: string; slug?: string };
  rating: number;
  title?: string;
  comment: string;
  pros: string[];
  cons: string[];
  status: 'pending' | 'approved' | 'rejected';
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: 'پیشنویس',
  published: 'منتشر شده',
  archived: 'بایگانی',
};

export const PRODUCT_STATUS_TONE: Record<ProductStatus, string> = {
  draft: 'badge',
  published: 'badge badge-success',
  archived: 'badge badge-danger',
};

export const PRODUCT_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'popular', label: 'پرفروشترین' },
  { value: 'price-asc', label: 'ارزانترین' },
  { value: 'price-desc', label: 'گرانترین' },
  { value: 'rating', label: 'بیشترین امتیاز' },
  { value: 'views', label: 'پر بازدیدترین' },
];
