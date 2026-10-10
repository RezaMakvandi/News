import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { OrderService } from '../../../../core/services/order.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe, FaDatePipe } from '../../../../shared/pipes/format.pipe';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABELS,
  type Order,
} from '../../../../core/models/order.model';

@Component({
  selector: 'app-my-orders',
  imports: [
    RouterLink,
    IconComponent,
    PaginationComponent,
    SpinnerComponent,
    FaNumberPipe,
    FaDatePipe,
    NgClass,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <div class="admin-page-head" style="margin-bottom: var(--space-5)">
        <div>
          <h1>سفارشهای من</h1>
          <p class="text-sm text-muted">پیگیری و مشاهده تاریخچه سفارشها.</p>
        </div>
        <a class="btn btn-soft" routerLink="/shop/products">
          <app-icon name="store" [size]="16" /> ادامه خرید
        </a>
      </div>

      @if (loading()) {
        <app-spinner label="در حال بارگذاری سفارشها..." />
      } @else if (orders().length) {
        <div class="stack-lg">
          @for (order of orders(); track order._id) {
            <a class="order-card" [routerLink]="['/shop/orders', order._id]" style="display:block">
              <div
                class="row"
                style="justify-content:space-between;flex-wrap:wrap;gap:var(--space-3)"
              >
                <div>
                  <strong dir="ltr" style="font-size:1rem">{{ order.orderNumber }}</strong>
                  <p class="text-xs text-muted">{{ order.createdAt | faDate: 'datetime' }}</p>
                </div>
                <div class="row" style="gap:var(--space-2)">
                  <span class="badge" [ngClass]="statusTone(order.status)">{{
                    statusLabel(order.status)
                  }}</span>
                  <span class="badge badge-info">{{ paymentLabel(order.paymentStatus) }}</span>
                </div>
              </div>

              <div class="row" style="gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap">
                @for (item of order.items.slice(0, 4); track $index) {
                  <span class="badge">{{ truncate(item.name) }}</span>
                }
                @if (order.items.length > 4) {
                  <span class="badge">+{{ order.items.length - 4 | faNumber }} مورد</span>
                }
              </div>

              <div
                class="row"
                style="justify-content:space-between;margin-top:var(--space-3);align-items:center"
              >
                <span class="text-sm text-muted">{{ order.items.length | faNumber }} قلم کالا</span>
                <strong style="color:var(--accent)">{{ order.payable | faNumber }} تومان</strong>
              </div>
            </a>
          }
        </div>

        <div class="row" style="justify-content:center;margin-top:var(--space-5)">
          <app-pagination
            [page]="page()"
            [totalPages]="totalPages()"
            (pageChange)="goToPage($event)"
          />
        </div>
      } @else {
        <div class="shop-empty">
          <div class="shop-empty-icon"><app-icon name="bag" [size]="40" /></div>
          <h2>هنوز سفارشی ثبت نکردهاید</h2>
          <p class="text-muted">با خرید از فروشگاه، سفارشهای شما اینجا نمایش داده میشود.</p>
          <a class="btn btn-primary" routerLink="/shop/products">شروع خرید</a>
        </div>
      }
    </div>
  `,
})
export class MyOrdersPage {
  private readonly orderService = inject(OrderService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  protected readonly orders = signal<Order[]>([]);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);

  constructor() {
    this.seo.set({ title: 'سفارشهای من' });
    this.load();
  }

  protected statusLabel(status: Order['status']): string {
    return ORDER_STATUS_LABELS[status] ?? status;
  }

  protected statusTone(status: Order['status']): string {
    return ORDER_STATUS_TONE[status] ?? 'badge';
  }

  protected paymentLabel(status: Order['paymentStatus']): string {
    return PAYMENT_STATUS_LABELS[status] ?? status;
  }

  protected truncate(value: string): string {
    return value.length > 34 ? `${value.slice(0, 34)}…` : value;
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.orderService.myOrders(this.page(), 15).subscribe({
      next: (result) => {
        this.orders.set(result.items ?? []);
        this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.toast.error(error.message);
      },
    });
  }
}
