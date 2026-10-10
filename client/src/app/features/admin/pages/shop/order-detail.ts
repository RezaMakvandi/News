import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
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
  type OrderStatus,
} from '../../../../core/models/order.model';

@Component({
  selector: 'app-admin-order-detail',
  imports: [
    FormsModule,
    RouterLink,
    IconComponent,
    SpinnerComponent,
    FaNumberPipe,
    FaDatePipe,
    NgClass,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>
          سفارش <span dir="ltr">{{ order()?.orderNumber }}</span>
        </h1>
        <p class="text-sm text-muted">
          <a routerLink="/admin/shop/orders">سفارشها</a> / جزئیات سفارش
        </p>
      </div>
      @if (order(); as item) {
        <span [ngClass]="statusTone(item.status)">{{ statusLabel(item.status) }}</span>
      }
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری سفارش..." />
    } @else if (order(); as item) {
      <div class="grid grid-2" style="align-items:start">
        <div class="stack" style="gap:var(--space-4)">
          <!-- Items -->
          <div class="card">
            <div class="card-head"><span class="card-title">اقلام سفارش</span></div>
            <div class="card-body">
              @for (product of item.items; track $index) {
                <div class="cart-item" style="grid-template-columns:60px minmax(0,1fr) auto">
                  @if (product.cover) {
                    <img
                      [src]="product.cover"
                      [alt]="product.name"
                      style="width:60px;height:60px"
                    />
                  }
                  <div>
                    <strong style="font-size:0.9rem">{{ product.name }}</strong>
                    @if (product.variant) {
                      <p class="text-xs text-muted">
                        {{ product.variant.name }}: {{ product.variant.value }}
                      </p>
                    }
                    <p class="text-sm text-muted">
                      {{ product.price | faNumber }} × {{ product.quantity | faNumber }}
                    </p>
                  </div>
                  <strong>{{ product.total | faNumber }} تومان</strong>
                </div>
              }
            </div>
          </div>

          <!-- Address -->
          <div class="card">
            <div class="card-head"><span class="card-title">اطلاعات گیرنده</span></div>
            <div class="card-body">
              <div class="grid grid-2" style="gap:var(--space-3)">
                <div>
                  <p class="text-xs text-muted">نام گیرنده</p>
                  <strong>{{ item.address.fullName }}</strong>
                </div>
                <div>
                  <p class="text-xs text-muted">تلفن</p>
                  <strong dir="ltr">{{ item.address.phone }}</strong>
                </div>
                <div>
                  <p class="text-xs text-muted">استان / شهر</p>
                  <strong>{{ item.address.province }} / {{ item.address.city }}</strong>
                </div>
                <div>
                  <p class="text-xs text-muted">کد پستی</p>
                  <strong dir="ltr">{{ item.address.postalCode || '—' }}</strong>
                </div>
              </div>
              <p style="margin-top:var(--space-3)">{{ item.address.address }}</p>
              @if (item.address.notes) {
                <p class="text-sm text-muted">توضیحات: {{ item.address.notes }}</p>
              }
            </div>
          </div>

          <!-- Payment -->
          <div class="card">
            <div class="card-head"><span class="card-title">اطلاعات پرداخت</span></div>
            <div class="card-body">
              <div class="summary-row">
                <span>جمع کالاها</span><span>{{ item.itemsTotal | faNumber }} تومان</span>
              </div>
              @if (item.discount > 0) {
                <div class="summary-row is-discount">
                  <span
                    >تخفیف
                    @if (item.couponCode) {
                      ({{ item.couponCode }})
                    }</span
                  ><span>− {{ item.discount | faNumber }} تومان</span>
                </div>
              }
              <div class="summary-row">
                <span>هزینه ارسال</span><span>{{ item.shippingCost | faNumber }} تومان</span>
              </div>
              <div class="summary-row is-total">
                <span>مبلغ کل</span><span>{{ item.payable | faNumber }} تومان</span>
              </div>
              @if (item.payment.refId) {
                <div class="summary-row">
                  <span>کد پیگیری (RefId)</span><strong dir="ltr">{{ item.payment.refId }}</strong>
                </div>
              }
              @if (item.payment.cardPan) {
                <div class="summary-row">
                  <span>کارت</span><strong dir="ltr">{{ item.payment.cardPan }}</strong>
                </div>
              }
              @if (item.payment.paidAt) {
                <div class="summary-row">
                  <span>زمان پرداخت</span
                  ><span>{{ item.payment.paidAt | faDate: 'datetime' }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="stack" style="gap:var(--space-4)">
          <!-- Manage status -->
          <div class="card">
            <div class="card-head"><span class="card-title">مدیریت سفارش</span></div>
            <div class="card-body">
              <div class="field">
                <label class="label">وضعیت سفارش</label>
                <select class="select" [(ngModel)]="statusForm" name="status">
                  @for (status of statuses; track status) {
                    <option [value]="status">{{ statusLabel(status) }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label class="label">کد رهگیری مرسوله</label>
                <input class="input" dir="ltr" [(ngModel)]="trackingCode" name="tracking" />
              </div>
              <div class="field">
                <label class="label">یادداشت داخلی</label>
                <textarea class="textarea" rows="2" [(ngModel)]="adminNote" name="note"></textarea>
              </div>
              <button
                type="button"
                class="btn btn-primary btn-block"
                [disabled]="saving()"
                (click)="saveStatus()"
              >
                <app-icon name="check" [size]="16" /> ذخیره تغییرات
              </button>

              <hr style="margin:var(--space-4) 0;border:0;border-top:1px solid var(--border)" />

              <div class="field">
                <label class="label">وضعیت پرداخت</label>
                <select
                  class="select"
                  [ngModel]="item.paymentStatus"
                  (ngModelChange)="updatePayment($event)"
                  name="payment"
                >
                  <option value="unpaid">پرداخت نشده</option>
                  <option value="paid">پرداخت شده</option>
                  <option value="failed">ناموفق</option>
                  <option value="refunded">برگشت داده شده</option>
                </select>
              </div>
              <span class="badge badge-info">{{ paymentLabel(item.paymentStatus) }}</span>
            </div>
          </div>

          <!-- Customer -->
          <div class="card">
            <div class="card-head"><span class="card-title">مشتری</span></div>
            <div class="card-body">
              @if (customer(); as user) {
                <strong>{{ user.name }}</strong>
                <p class="text-sm text-muted" dir="ltr">{{ user.email }}</p>
              } @else {
                <p class="text-muted">اطلاعات مشتری در دسترس نیست.</p>
              }
            </div>
          </div>
        </div>
      </div>
    } @else {
      <p class="text-muted">سفارش یافت نشد.</p>
    }
  `,
})
export class AdminOrderDetailPage {
  readonly id = input('');

  private readonly orderService = inject(OrderService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  protected readonly order = signal<Order | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly statuses: OrderStatus[] = [
    'pending',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
    'failed',
  ];

  protected statusForm: OrderStatus = 'pending';
  protected trackingCode = '';
  protected adminNote = '';

  constructor() {
    this.seo.set({ title: 'جزئیات سفارش | پنل مدیریت' });

    effect(() => {
      const id = this.id();
      if (!id) return;

      this.loading.set(true);
      this.orderService.adminOrder(id).subscribe({
        next: (order) => {
          this.order.set(order);
          this.statusForm = order.status;
          this.trackingCode = order.trackingCode ?? '';
          this.adminNote = order.adminNote ?? '';
          this.loading.set(false);
        },
        error: () => {
          this.order.set(null);
          this.loading.set(false);
        },
      });
    });
  }

  protected customer(): { name: string; email: string } | null {
    const user = this.order()?.user;
    return typeof user === 'object' && user ? { name: user.name, email: user.email } : null;
  }

  protected statusLabel(status: string): string {
    return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
  }

  protected statusTone(status: string): string {
    return ORDER_STATUS_TONE[status as OrderStatus] ?? 'badge';
  }

  protected paymentLabel(status: Order['paymentStatus']): string {
    return PAYMENT_STATUS_LABELS[status] ?? status;
  }

  protected saveStatus(): void {
    const order = this.order();
    if (!order) return;
    this.saving.set(true);
    this.orderService
      .updateOrderStatus(order._id, {
        status: this.statusForm,
        trackingCode: this.trackingCode || undefined,
        adminNote: this.adminNote || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.order.set(updated);
          this.toast.success('سفارش بهروزرسانی شد');
        },
        error: (error: Error) => {
          this.saving.set(false);
          this.toast.error(error.message);
        },
      });
  }

  protected updatePayment(status: string): void {
    const order = this.order();
    if (!order) return;
    this.orderService.updateOrderPayment(order._id, status).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.toast.success('وضعیت پرداخت بهروزرسانی شد');
      },
      error: (error: Error) => this.toast.error(error.message),
    });
  }
}
