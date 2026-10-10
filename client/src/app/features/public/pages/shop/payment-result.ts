import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SeoService } from '../../../../core/services/seo.service';
import { OrderService } from '../../../../core/services/order.service';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import type { Order } from '../../../../core/models/order.model';

@Component({
  selector: 'app-payment-result',
  imports: [RouterLink, IconComponent, FaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <div class="payment-result">
        @if (success()) {
          <div class="result-icon is-success"><app-icon name="check-circle" [size]="48" /></div>
          <h1>پرداخت با موفقیت انجام شد</h1>
          <p class="text-muted">
            سفارش شما با موفقیت ثبت و پرداخت شد. کد پیگیری را نزد خود نگه دارید.
          </p>

          @if (orderData(); as item) {
            <div class="card card-pad" style="margin-top:var(--space-4);text-align:start">
              <div class="summary-row">
                <span>شماره سفارش</span>
                <strong dir="ltr">{{ item.orderNumber }}</strong>
              </div>
              @if (reference()) {
                <div class="summary-row">
                  <span>کد پیگیری پرداخت</span>
                  <strong dir="ltr">{{ reference() }}</strong>
                </div>
              }
              <div class="summary-row is-total">
                <span>مبلغ پرداختشده</span>
                <span>{{ item.payable | faNumber }} تومان</span>
              </div>
            </div>
          }

          <div
            class="row"
            style="justify-content:center;gap:var(--space-3);margin-top:var(--space-5)"
          >
            @if (orderData(); as item) {
              <a class="btn btn-primary" [routerLink]="['/shop/orders', item._id]">مشاهده سفارش</a>
            } @else {
              <a class="btn btn-primary" routerLink="/shop/orders">سفارشهای من</a>
            }
            <a class="btn btn-outline" routerLink="/shop/products">ادامه خرید</a>
          </div>
        } @else {
          <div class="result-icon is-failed"><app-icon name="x-circle" [size]="48" /></div>
          <h1>پرداخت ناموفق بود</h1>
          <p class="text-muted">{{ failureMessage() }}</p>

          <div
            class="row"
            style="justify-content:center;gap:var(--space-3);margin-top:var(--space-5)"
          >
            <a class="btn btn-primary" routerLink="/shop/cart">بازگشت به سبد خرید</a>
            <a class="btn btn-outline" routerLink="/shop/orders">سفارشهای من</a>
          </div>
        }
      </div>
    </div>
  `,
})
export class PaymentResultPage {
  /** Query params bound from the Zarinpal redirect (`?order=&status=&ref=&reason=`). */
  readonly status = input('');
  readonly order = input(''); // order number
  readonly ref = input('');
  readonly reason = input('');

  private readonly orders = inject(OrderService);
  private readonly seo = inject(SeoService);

  protected readonly orderData = signal<Order | null>(null);
  protected readonly success = computed(() => this.status() === 'success');
  protected readonly reference = computed(
    () => this.ref() || this.orderData()?.payment?.refId || '',
  );

  constructor() {
    this.seo.set({ title: 'نتیجه پرداخت' });

    const orderNumber = this.order();
    if (orderNumber) {
      this.orders.lookup(orderNumber).subscribe({
        next: (order) => this.orderData.set(order),
        error: () => undefined,
      });
    }
  }

  protected failureMessage(): string {
    switch (this.reason()) {
      case 'cancelled':
        return 'پرداخت توسط شما لغو شد یا درگاه آن را تأیید نکرد.';
      case 'verify':
        return 'تأیید پرداخت ناموفق بود. در صورت کسر وجه، مبلغ تا ۷۲ ساعت بازگردانده میشود.';
      case 'notfound':
        return 'سفارش متناظر با این پرداخت یافت نشد.';
      default:
        return 'پرداخت انجام نشد. میتوانید مجدداً تلاش کنید.';
    }
  }
}
