import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { OrderService } from '../../../../core/services/order.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe, FaDatePipe } from '../../../../shared/pipes/format.pipe';
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABELS,
  type Order,
  type OrderStatus,
} from '../../../../core/models/order.model';

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, IconComponent, SpinnerComponent, FaNumberPipe, FaDatePipe, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      @if (loading()) {
        <app-spinner label="در حال بارگذاری سفارش..." />
      } @else if (order(); as item) {
        <div class="breadcrumb" style="margin-bottom: var(--space-4)">
          <a routerLink="/shop/orders">سفارشهای من</a>
          <span class="sep">/</span>
          <span dir="ltr">{{ item.orderNumber }}</span>
        </div>

        <div
          class="row"
          style="justify-content:space-between;flex-wrap:wrap;gap:var(--space-3);margin-bottom:var(--space-5)"
        >
          <div>
            <h1 style="margin-bottom:4px">
              سفارش <span dir="ltr">{{ item.orderNumber }}</span>
            </h1>
            <p class="text-sm text-muted">ثبت شده در {{ item.createdAt | faDate: 'datetime' }}</p>
          </div>
          <div class="row" style="gap:var(--space-2)">
            <span class="badge" [ngClass]="statusTone(item.status)">{{
              statusLabel(item.status)
            }}</span>
            <span class="badge badge-info">{{ paymentLabel(item.paymentStatus) }}</span>
          </div>
        </div>

        <!-- Timeline -->
        @if (!isTerminal()) {
          <div class="card card-pad" style="margin-bottom:var(--space-5)">
            <div class="order-timeline">
              @for (step of flow; track step) {
                <div class="step" [class.is-done]="isStepDone(step)">
                  <span class="dot"
                    ><app-icon [name]="isStepDone(step) ? 'check' : 'clock'" [size]="14"
                  /></span>
                  <span>{{ statusLabel(step) }}</span>
                </div>
              }
            </div>
          </div>
        }

        <div class="cart-layout">
          <div class="stack-lg">
            <div class="card">
              <div class="card-head"><span class="card-title">اقلام سفارش</span></div>
              <div class="card-body">
                @for (product of item.items; track $index) {
                  <div class="cart-item">
                    <a [routerLink]="['/shop/product', product.slug]">
                      @if (product.cover) {
                        <img [src]="product.cover" [alt]="product.name" />
                      }
                    </a>
                    <div>
                      <a [routerLink]="['/shop/product', product.slug]" style="font-weight:700">{{
                        product.name
                      }}</a>
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

            <div class="card">
              <div class="card-head"><span class="card-title">اطلاعات ارسال</span></div>
              <div class="card-body">
                <div class="row" style="gap:var(--space-6);flex-wrap:wrap">
                  <div>
                    <p class="text-xs text-muted">گیرنده</p>
                    <strong>{{ item.address.fullName }}</strong>
                  </div>
                  <div>
                    <p class="text-xs text-muted">تماس</p>
                    <strong dir="ltr">{{ item.address.phone }}</strong>
                  </div>
                  <div>
                    <p class="text-xs text-muted">کد پستی</p>
                    <strong dir="ltr">{{ item.address.postalCode || '—' }}</strong>
                  </div>
                </div>
                <p style="margin-top:var(--space-3)">
                  {{ item.address.province }}، {{ item.address.city }}، {{ item.address.address }}
                </p>
                @if (item.address.notes) {
                  <p class="text-sm text-muted" style="margin-top:6px">
                    توضیحات: {{ item.address.notes }}
                  </p>
                }
                @if (item.trackingCode) {
                  <p class="badge badge-info" style="margin-top:var(--space-3)">
                    کد رهگیری مرسوله: <span dir="ltr">{{ item.trackingCode }}</span>
                  </p>
                }
              </div>
            </div>
          </div>

          <aside class="summary-card">
            <h3 class="card-title" style="margin-bottom:var(--space-3)">خلاصه پرداخت</h3>
            <div class="summary-row">
              <span>جمع کالاها</span><span>{{ item.itemsTotal | faNumber }} تومان</span>
            </div>
            @if (item.discount > 0) {
              <div class="summary-row is-discount">
                <span
                  >تخفیف
                  @if (item.couponCode) {
                    ({{ item.couponCode }})
                  }
                </span>
                <span>− {{ item.discount | faNumber }} تومان</span>
              </div>
            }
            <div class="summary-row">
              <span>هزینه ارسال</span>
              <span>
                @if (item.shippingCost === 0) {
                  رایگان
                } @else {
                  {{ item.shippingCost | faNumber }} تومان
                }
              </span>
            </div>
            <div class="summary-row is-total">
              <span>مبلغ کل</span><span>{{ item.payable | faNumber }} تومان</span>
            </div>

            @if (item.payment.refId) {
              <div class="summary-row">
                <span>کد پیگیری پرداخت</span><strong dir="ltr">{{ item.payment.refId }}</strong>
              </div>
            }

            <div class="stack" style="margin-top:var(--space-4);gap:var(--space-2)">
              @if (canPay()) {
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  [disabled]="paying()"
                  (click)="pay()"
                >
                  <app-icon name="credit-card" [size]="18" /> پرداخت سفارش
                </button>
              }
              @if (canCancel()) {
                <button
                  type="button"
                  class="btn btn-danger-soft btn-block"
                  [disabled]="cancelling()"
                  (click)="cancel()"
                >
                  <app-icon name="x-circle" [size]="16" /> لغو سفارش
                </button>
              }
            </div>
          </aside>
        </div>
      } @else {
        <div class="shop-empty">
          <div class="shop-empty-icon"><app-icon name="bag" [size]="40" /></div>
          <h2>سفارش یافت نشد</h2>
          <a class="btn btn-primary" routerLink="/shop/orders">بازگشت به سفارشها</a>
        </div>
      }
    </div>
  `,
})
export class OrderDetailPage {
  /** Bound from the `shop/orders/:id` route parameter. */
  readonly id = input('');

  private readonly orderService = inject(OrderService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  protected readonly order = signal<Order | null>(null);
  protected readonly loading = signal(true);
  protected readonly paying = signal(false);
  protected readonly cancelling = signal(false);
  protected readonly flow = ORDER_STATUS_FLOW;

  protected readonly isTerminal = computed(() => {
    const status = this.order()?.status;
    return status === 'cancelled' || status === 'refunded' || status === 'failed';
  });

  constructor() {
    this.seo.set({ title: 'جزئیات سفارش' });
    this.load();
  }

  protected statusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status] ?? status;
  }

  protected statusTone(status: OrderStatus): string {
    return ORDER_STATUS_TONE[status] ?? 'badge';
  }

  protected paymentLabel(status: Order['paymentStatus']): string {
    return PAYMENT_STATUS_LABELS[status] ?? status;
  }

  protected isStepDone(step: OrderStatus): boolean {
    const current = this.order()?.status;
    if (!current) return false;
    return ORDER_STATUS_FLOW.indexOf(step) <= ORDER_STATUS_FLOW.indexOf(current);
  }

  protected canPay(): boolean {
    const item = this.order();
    if (!item) return false;
    return item.paymentStatus !== 'paid' && !this.isTerminal();
  }

  protected canCancel(): boolean {
    const status = this.order()?.status;
    return status === 'pending' || status === 'paid' || status === 'processing';
  }

  protected pay(): void {
    const item = this.order();
    if (!item) return;
    this.paying.set(true);
    this.orderService.startPayment(item._id).subscribe({
      next: (result) => (window.location.href = result.paymentUrl),
      error: (error: Error) => {
        this.paying.set(false);
        this.toast.error(error.message);
      },
    });
  }

  protected cancel(): void {
    const item = this.order();
    if (!item) return;
    this.cancelling.set(true);
    this.orderService.cancel(item._id, 'لغو توسط کاربر').subscribe({
      next: (order) => {
        this.cancelling.set(false);
        this.order.set(order);
        this.toast.success('سفارش لغو شد');
      },
      error: (error: Error) => {
        this.cancelling.set(false);
        this.toast.error(error.message);
      },
    });
  }

  private load(): void {
    const id = this.id();
    if (!id) return;
    this.orderService.myOrder(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: () => {
        this.order.set(null);
        this.loading.set(false);
      },
    });
  }
}
