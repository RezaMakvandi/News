import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
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
  selector: 'app-admin-orders',
  imports: [
    FormsModule,
    RouterLink,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    FaNumberPipe,
    FaDatePipe,
    NgClass,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>سفارشها</h1>
        <p class="text-sm text-muted">مدیریت و پیگیری سفارشهای فروشگاه.</p>
      </div>
    </div>

    <div class="filter-bar">
      <div class="input-search">
        <app-icon name="search" [size]="16" />
        <input
          class="input"
          type="search"
          placeholder="شماره سفارش، نام یا تلفن..."
          [(ngModel)]="searchTerm"
          (input)="onSearch()"
        />
      </div>
      <select
        class="select"
        style="width:180px"
        [ngModel]="statusFilter()"
        (ngModelChange)="setStatus($event)"
      >
        <option value="all">همه وضعیتها</option>
        @for (status of statuses; track status) {
          <option [value]="status">{{ statusLabel(status) }}</option>
        }
      </select>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری سفارشها..." />
    } @else if (!orders().length) {
      <app-empty-state icon="bag" title="سفارشی یافت نشد" description="هنوز سفارشی ثبت نشده است." />
    } @else {
      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>شماره سفارش</th>
                <th>مشتری</th>
                <th>تاریخ</th>
                <th>مبلغ</th>
                <th>وضعیت</th>
                <th>پرداخت</th>
                <th style="width:80px"></th>
              </tr>
            </thead>
            <tbody>
              @for (order of orders(); track order._id) {
                <tr>
                  <td>
                    <a
                      [routerLink]="['/admin/shop/orders', order._id]"
                      dir="ltr"
                      style="font-weight:700"
                      >{{ order.orderNumber }}</a
                    >
                  </td>
                  <td>
                    {{ customerName(order) }}
                    <p class="text-xs text-muted" dir="ltr">{{ order.address.phone }}</p>
                  </td>
                  <td class="text-sm text-muted">{{ order.createdAt | faDate }}</td>
                  <td>
                    <strong>{{ order.payable | faNumber }} تومان</strong>
                  </td>
                  <td>
                    <span [ngClass]="statusTone(order.status)">{{
                      statusLabel(order.status)
                    }}</span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-success]="order.paymentStatus === 'paid'"
                      [class.badge-danger]="order.paymentStatus === 'failed'"
                    >
                      {{ paymentLabel(order.paymentStatus) }}
                    </span>
                  </td>
                  <td>
                    <a
                      class="btn btn-ghost btn-icon"
                      [routerLink]="['/admin/shop/orders', order._id]"
                      aria-label="مشاهده"
                    >
                      <app-icon name="eye" [size]="16" />
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="row" style="justify-content:center;margin-top:var(--space-4)">
        <app-pagination
          [page]="page()"
          [totalPages]="totalPages()"
          (pageChange)="goToPage($event)"
        />
      </div>
    }
  `,
})
export class AdminOrdersPage {
  private readonly orderService = inject(OrderService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  protected readonly orders = signal<Order[]>([]);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly statusFilter = signal('all');
  protected readonly statuses = [
    'pending',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
    'failed',
  ] as const;

  protected searchTerm = '';

  constructor() {
    this.seo.set({ title: 'سفارشها | پنل مدیریت' });
    this.load();
  }

  protected statusLabel(status: string): string {
    return ORDER_STATUS_LABELS[status as Order['status']] ?? status;
  }

  protected statusTone(status: string): string {
    return ORDER_STATUS_TONE[status as Order['status']] ?? 'badge';
  }

  protected paymentLabel(status: Order['paymentStatus']): string {
    return PAYMENT_STATUS_LABELS[status] ?? status;
  }

  protected customerName(order: Order): string {
    if (typeof order.user === 'object' && order.user) return order.user.name;
    return order.address.fullName;
  }

  protected onSearch(): void {
    this.page.set(1);
    this.load();
  }

  protected setStatus(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.load();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.orderService
      .adminOrders({
        page: this.page(),
        limit: 20,
        q: this.searchTerm.trim() || undefined,
        status: this.statusFilter(),
      })
      .subscribe({
        next: (result) => {
          this.orders.set(result.items ?? []);
          this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
