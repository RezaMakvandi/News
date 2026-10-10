import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ApiList } from '../models/api.model';
import type {
  Brand,
  FeaturedProducts,
  Product,
  ProductCard,
  ProductCategory,
  ProductDetailResponse,
  ProductFacets,
  ProductPayload,
  ProductQuery,
  ProductReview,
} from '../models/product.model';

export interface AdminProductList {
  items: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    statusCounts?: Record<string, number>;
  };
}

export type ProductBulkAction = 'publish' | 'draft' | 'archive' | 'delete';

/** Public + admin catalogue endpoints. */
@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly api = inject(ApiService);

  /* ------------------------------- Public -------------------------------- */

  /** GET /api/shop/products */
  list(query: ProductQuery = {}): Observable<ApiList<ProductCard>> {
    return this.api.getList<ProductCard>('shop/products', { params: { ...query } });
  }

  /** GET /api/shop/products/featured */
  featured(): Observable<FeaturedProducts> {
    return this.api.get<FeaturedProducts>('shop/products/featured');
  }

  /** GET /api/shop/products/facets */
  facets(): Observable<ProductFacets> {
    return this.api.get<ProductFacets>('shop/products/facets');
  }

  /** GET /api/shop/products/:slug */
  bySlug(slug: string): Observable<ProductDetailResponse> {
    return this.api.get<ProductDetailResponse>(`shop/products/${slug}`);
  }

  /** GET /api/shop/products/:slug/reviews */
  reviews(slug: string, page = 1, limit = 10): Observable<ApiList<ProductReview>> {
    return this.api.getList<ProductReview>(`shop/products/${slug}/reviews`, {
      params: { page, limit },
    });
  }

  /** POST /api/shop/products/:slug/reviews */
  createReview(
    slug: string,
    payload: { rating: number; title?: string; comment: string; pros?: string[]; cons?: string[] },
  ): Observable<ProductReview> {
    return this.api.post<ProductReview>(`shop/products/${slug}/reviews`, payload);
  }

  /** POST /api/shop/reviews/:id/helpful */
  markReviewHelpful(id: string): Observable<{ helpfulCount: number }> {
    return this.api.post<{ helpfulCount: number }>(`shop/reviews/${id}/helpful`);
  }

  /** GET /api/shop/brands */
  brands(all = false): Observable<Brand[]> {
    return this.api.get<Brand[]>('shop/brands', { params: all ? { all: true } : {} });
  }

  /** GET /api/shop/categories */
  categories(all = false): Observable<ProductCategory[]> {
    return this.api.get<ProductCategory[]>('shop/categories', { params: all ? { all: true } : {} });
  }

  /** POST /api/shop/compare */
  compare(ids: string[]): Observable<ProductCard[]> {
    return this.api.post<ProductCard[]>('shop/compare', { ids });
  }

  /* -------------------------------- Admin -------------------------------- */

  adminProducts(
    query: ProductQuery & { status?: string; sort?: string } = {},
  ): Observable<AdminProductList> {
    return this.api.getListWithMeta<Product>('admin/shop/products', { params: { ...query } });
  }

  adminGet(id: string): Observable<Product> {
    return this.api.get<Product>(`admin/shop/products/${id}`);
  }

  create(payload: ProductPayload): Observable<Product> {
    return this.api.post<Product>('admin/shop/products', payload);
  }

  update(id: string, payload: Partial<ProductPayload>): Observable<Product> {
    return this.api.put<Product>(`admin/shop/products/${id}`, payload);
  }

  updateStatus(id: string, status: string): Observable<Product> {
    return this.api.patch<Product>(`admin/shop/products/${id}/status`, { status });
  }

  updateStock(id: string, stock: number): Observable<Product> {
    return this.api.patch<Product>(`admin/shop/products/${id}/stock`, { stock });
  }

  remove(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/shop/products/${id}`);
  }

  bulk(ids: string[], action: ProductBulkAction): Observable<{ affected: number }> {
    return this.api.post<{ affected: number }>('admin/shop/products/bulk', { ids, action });
  }

  /* ------------------------- Admin: brands ------------------------------- */

  createBrand(payload: Partial<Brand>): Observable<Brand> {
    return this.api.post<Brand>('admin/shop/brands', payload);
  }

  updateBrand(id: string, payload: Partial<Brand>): Observable<Brand> {
    return this.api.put<Brand>(`admin/shop/brands/${id}`, payload);
  }

  removeBrand(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/shop/brands/${id}`);
  }

  /* ---------------------- Admin: product categories ---------------------- */

  createCategory(payload: Partial<ProductCategory>): Observable<ProductCategory> {
    return this.api.post<ProductCategory>('admin/shop/categories', payload);
  }

  updateCategory(id: string, payload: Partial<ProductCategory>): Observable<ProductCategory> {
    return this.api.put<ProductCategory>(`admin/shop/categories/${id}`, payload);
  }

  removeCategory(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/shop/categories/${id}`);
  }
}
