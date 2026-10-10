import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ApiList } from '../models/api.model';
import type {
  CheckoutPayload,
  Coupon,
  CouponPayload,
  Order,
  OrderQuery,
  ShopStatsCharts,
  ShopStatsOverview,
} from '../models/order.model';
import type { ProductReview } from '../models/product.model';

export interface AdminOrderList {
  items: Order[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    statusCounts?: Record<string, number>;
  };
}

export interface AdminReviewList {
  items: ProductReview[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    statusCounts?: Record<string, number>;
  };
}

/** Orders, coupons, reviews and shop analytics. */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiService);

  /* ------------------------------ Checkout ------------------------------- */

  /** POST /api/shop/checkout */
  checkout(payload: CheckoutPayload): Observable<Order> {
    return this.api.post<Order>('shop/checkout', payload);
  }

  /** POST /api/shop/orders/:id/pay — returns the Zarinpal redirect URL. */
  startPayment(
    orderId: string,
  ): Observable<{ paymentUrl: string; authority: string; orderNumber: string }> {
    return this.api.post<{ paymentUrl: string; authority: string; orderNumber: string }>(
      `shop/orders/${orderId}/pay`,
    );
  }

  /** POST /api/shop/payment/verify — server-side verification fallback. */
  verifyPayment(orderId: string, authority: string): Observable<Order> {
    return this.api.post<Order>('shop/payment/verify', { orderId, authority });
  }

  /* ------------------------------- Orders -------------------------------- */

  /** GET /api/shop/orders */
  myOrders(page = 1, limit = 20): Observable<ApiList<Order>> {
    return this.api.getList<Order>('shop/orders', { params: { page, limit } });
  }

  /** GET /api/shop/orders/:id */
  myOrder(id: string): Observable<Order> {
    return this.api.get<Order>(`shop/orders/${id}`);
  }

  /** GET /api/shop/orders/lookup/:orderNumber */
  lookup(orderNumber: string): Observable<Order> {
    return this.api.get<Order>(`shop/orders/lookup/${orderNumber}`);
  }

  /** POST /api/shop/orders/:id/cancel */
  cancel(id: string, reason?: string): Observable<Order> {
    return this.api.post<Order>(`shop/orders/${id}/cancel`, { reason });
  }

  /* -------------------------- Admin: orders ------------------------------ */

  /** GET /api/admin/shop/orders */
  adminOrders(query: OrderQuery = {}): Observable<AdminOrderList> {
    return this.api.getListWithMeta<Order>('admin/shop/orders', { params: { ...query } });
  }

  /** GET /api/admin/shop/orders/:id */
  adminOrder(id: string): Observable<Order> {
    return this.api.get<Order>(`admin/shop/orders/${id}`);
  }

  /** PATCH /api/admin/shop/orders/:id/status */
  updateOrderStatus(
    id: string,
    payload: { status?: string; trackingCode?: string; cancelReason?: string; adminNote?: string },
  ): Observable<Order> {
    return this.api.patch<Order>(`admin/shop/orders/${id}/status`, payload);
  }

  /** PATCH /api/admin/shop/orders/:id/payment */
  updateOrderPayment(id: string, paymentStatus: string): Observable<Order> {
    return this.api.patch<Order>(`admin/shop/orders/${id}/payment`, { paymentStatus });
  }

  /** POST /api/admin/shop/orders/bulk */
  bulkOrders(ids: string[], action: string): Observable<{ affected: number }> {
    return this.api.post<{ affected: number }>('admin/shop/orders/bulk', { ids, action });
  }

  /* -------------------------- Admin: coupons ----------------------------- */

  /** GET /api/admin/shop/coupons */
  coupons(page = 1, limit = 40, q = ''): Observable<ApiList<Coupon>> {
    return this.api.getList<Coupon>('admin/shop/coupons', { params: { page, limit, q } });
  }

  /** POST /api/admin/shop/coupons */
  createCoupon(payload: CouponPayload): Observable<Coupon> {
    return this.api.post<Coupon>('admin/shop/coupons', payload);
  }

  /** PUT /api/admin/shop/coupons/:id */
  updateCoupon(id: string, payload: Partial<CouponPayload>): Observable<Coupon> {
    return this.api.put<Coupon>(`admin/shop/coupons/${id}`, payload);
  }

  /** DELETE /api/admin/shop/coupons/:id */
  removeCoupon(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/shop/coupons/${id}`);
  }

  /* -------------------------- Admin: reviews ----------------------------- */

  /** GET /api/admin/shop/reviews */
  adminReviews(
    query: { page?: number; limit?: number; status?: string; q?: string } = {},
  ): Observable<AdminReviewList> {
    return this.api.getListWithMeta<ProductReview>('admin/shop/reviews', { params: { ...query } });
  }

  /** PATCH /api/admin/shop/reviews/:id/status */
  updateReviewStatus(id: string, status: string): Observable<ProductReview> {
    return this.api.patch<ProductReview>(`admin/shop/reviews/${id}/status`, { status });
  }

  /** DELETE /api/admin/shop/reviews/:id */
  removeReview(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/shop/reviews/${id}`);
  }

  /* ---------------------------- Admin: stats ----------------------------- */

  /** GET /api/admin/shop/stats/overview */
  statsOverview(): Observable<ShopStatsOverview> {
    return this.api.get<ShopStatsOverview>('admin/shop/stats/overview');
  }

  /** GET /api/admin/shop/stats/charts */
  statsCharts(): Observable<ShopStatsCharts> {
    return this.api.get<ShopStatsCharts>('admin/shop/stats/charts');
  }
}
