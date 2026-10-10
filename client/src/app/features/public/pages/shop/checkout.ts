import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { CartService } from '../../../../core/services/cart.service';
import { OrderService } from '../../../../core/services/order.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import { IRAN_PROVINCES } from '../../../../core/utils/shop';
import type { CheckoutPayload, OrderAddress } from '../../../../core/models/order.model';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink, IconComponent, SpinnerComponent, FaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <div class="breadcrumb" style="margin-bottom: var(--space-4)">
        <a routerLink="/shop/cart">سبد خرید</a>
        <span class="sep">/</span>
        <span>تسویه حساب</span>
      </div>
      <h1 style="margin-bottom: var(--space-5)">تسویه حساب</h1>

      @if (loading()) {
        <app-spinner label="در حال بارگذاری..." />
      } @else if (cart().items.length === 0) {
        <div class="shop-empty">
          <div class="shop-empty-icon"><app-icon name="cart" [size]="40" /></div>
          <h2>سبد خرید شما خالی است</h2>
          <a class="btn btn-primary" routerLink="/shop/products">مشاهده محصولات</a>
        </div>
      } @else {
        <div class="checkout-layout">
          <div class="card">
            <div class="card-head"><span class="card-title">اطلاعات گیرنده</span></div>
            <div class="card-body">
              <div class="form-grid">
                <div class="field">
                  <label class="label">نام و نام خانوادگی <span class="req">*</span></label>
                  <input class="input" [(ngModel)]="address.fullName" name="fullName" />
                </div>
                <div class="field">
                  <label class="label">شماره تماس <span class="req">*</span></label>
                  <input
                    class="input"
                    dir="ltr"
                    [(ngModel)]="address.phone"
                    name="phone"
                    placeholder="09xxxxxxxxx"
                  />
                </div>
                <div class="field">
                  <label class="label">استان <span class="req">*</span></label>
                  <select class="select" [(ngModel)]="address.province" name="province">
                    <option value="">انتخاب کنید</option>
                    @for (province of provinces; track province) {
                      <option [value]="province">{{ province }}</option>
                    }
                  </select>
                </div>
                <div class="field">
                  <label class="label">شهر <span class="req">*</span></label>
                  <input class="input" [(ngModel)]="address.city" name="city" />
                </div>
                <div class="field">
                  <label class="label">کد پستی</label>
                  <input
                    class="input"
                    dir="ltr"
                    [(ngModel)]="address.postalCode"
                    name="postalCode"
                  />
                </div>
                <div class="field is-full">
                  <label class="label">نشانی کامل <span class="req">*</span></label>
                  <textarea
                    class="textarea"
                    rows="3"
                    [(ngModel)]="address.address"
                    name="address"
                    placeholder="خیابان، کوچه، پلاک و واحد"
                  ></textarea>
                </div>
                <div class="field is-full">
                  <label class="label">توضیحات (اختیاری)</label>
                  <input
                    class="input"
                    [(ngModel)]="address.notes"
                    name="notes"
                    placeholder="زمان مناسب تحویل یا نکته خاص"
                  />
                </div>
              </div>
            </div>
          </div>

          <aside class="summary-card">
            <h3 class="card-title" style="margin-bottom: var(--space-3)">پرداخت</h3>

            <div class="summary-row">
              <span>جمع کالاها ({{ cart().itemsCount | faNumber }})</span>
              <span>{{ cart().subtotal | faNumber }} تومان</span>
            </div>
            <div class="summary-row">
              <span>هزینه ارسال</span>
              <span>
                @if (cart().shippingCost === 0) {
                  رایگان
                } @else {
                  {{ cart().shippingCost | faNumber }} تومان
                }
              </span>
            </div>
            @if (couponCode()) {
              <div class="summary-row is-discount">
                <span>کد تخفیف ({{ couponCode() }})</span>
                <span>اعمال خواهد شد</span>
              </div>
            }

            <div class="summary-row is-total">
              <span>مبلغ قابل پرداخت</span>
              <span>{{ estimatedTotal() | faNumber }} تومان</span>
            </div>

            <div
              class="card card-pad"
              style="margin-top:var(--space-4);display:flex;gap:var(--space-3);align-items:center;background:var(--accent-softer)"
            >
              <app-icon name="credit-card" [size]="26" style="color:var(--accent)" />
              <div>
                <strong style="font-size:0.9rem">پرداخت آنلاین زرینپال</strong>
                <p class="text-xs text-muted">پس از ثبت سفارش به درگاه امن زرینپال هدایت میشوید.</p>
              </div>
            </div>

            <button
              type="button"
              class="btn btn-primary btn-lg btn-block"
              style="margin-top:var(--space-4)"
              [disabled]="submitting()"
              (click)="submit()"
            >
              @if (submitting()) {
                <span class="spinner spinner-sm"></span>
              }
              <app-icon name="wallet" [size]="18" />
              ثبت و پرداخت سفارش
            </button>
          </aside>
        </div>
      }
    </div>
  `,
})
export class CheckoutPage {
  /** Coupon carried over from the cart page. */
  readonly coupon = input('');

  protected readonly auth = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly orders = inject(OrderService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly cart = this.cartService.cart;
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly provinces = IRAN_PROVINCES;

  protected readonly couponCode = computed(() => this.coupon() || '');

  protected address: OrderAddress = {
    fullName: this.auth.currentUser()?.name ?? '',
    phone: '',
    province: '',
    city: '',
    postalCode: '',
    address: '',
    notes: '',
  };

  protected readonly estimatedTotal = computed(
    () => this.cart().subtotal + this.cart().shippingCost,
  );

  constructor() {
    this.seo.set({ title: 'تسویه حساب' });
    this.cartService.load().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  protected submit(): void {
    if (
      !this.address.fullName.trim() ||
      !this.address.phone.trim() ||
      !this.address.address.trim()
    ) {
      this.toast.warning('نام گیرنده، شماره تماس و نشانی الزامی است');
      return;
    }
    if (!/^09\d{9}$/.test(this.address.phone.replace(/[^\d]/g, ''))) {
      this.toast.warning('شماره تماس معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)');
      return;
    }

    this.submitting.set(true);
    const payload: CheckoutPayload = {
      address: this.address,
      couponCode: this.couponCode() || undefined,
      shippingMethod: 'post',
    };

    this.orders.checkout(payload).subscribe({
      next: (order) => this.pay(order._id, order.orderNumber),
      error: (error: Error) => {
        this.submitting.set(false);
        this.toast.error(error.message);
      },
    });
  }

  private pay(orderId: string, orderNumber: string): void {
    this.orders.startPayment(orderId).subscribe({
      next: (result) => {
        // Hand off to Zarinpal's hosted payment page.
        window.location.href = result.paymentUrl;
      },
      error: (error: Error) => {
        this.submitting.set(false);
        this.toast.error(error.message);
        void this.router.navigate(['/shop/orders'], { queryParams: { order: orderNumber } });
      },
    });
  }
}
