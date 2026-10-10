import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import type { CartTotals } from '../../../../core/models/cart.model';

@Component({
  selector: 'app-cart',
  imports: [FormsModule, RouterLink, IconComponent, SpinnerComponent, FaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <h1 style="margin-bottom: var(--space-5)"><app-icon name="cart" [size]="22" /> سبد خرید</h1>

      @if (!auth.isLoggedIn()) {
        <div class="shop-empty">
          <div class="shop-empty-icon"><app-icon name="user" [size]="40" /></div>
          <h2>برای مشاهده سبد خرید وارد شوید</h2>
          <p class="text-muted">سبد خرید به حساب کاربری شما گره خورده است.</p>
          <a
            class="btn btn-primary"
            routerLink="/admin/login"
            [queryParams]="{ redirect: '/shop/cart' }"
            >ورود / ثبتنام</a
          >
        </div>
      } @else if (loading()) {
        <app-spinner label="در حال بارگذاری سبد خرید..." />
      } @else if (cart().items.length === 0) {
        <div class="shop-empty">
          <div class="shop-empty-icon"><app-icon name="cart" [size]="40" /></div>
          <h2>سبد خرید شما خالی است</h2>
          <p class="text-muted">از فروشگاه محصولات مورد علاقه خود را اضافه کنید.</p>
          <a class="btn btn-primary" routerLink="/shop/products">مشاهده محصولات</a>
        </div>
      } @else {
        <div class="cart-layout">
          <div class="card">
            <div class="card-head">
              <span class="card-title">اقلام سبد ({{ cart().itemsCount | faNumber }} کالا)</span>
              <button type="button" class="btn btn-ghost btn-sm" (click)="clearCart()">
                <app-icon name="trash" [size]="15" /> خالی کردن سبد
              </button>
            </div>
            <div class="card-body">
              @for (item of cart().items; track item.id) {
                <div class="cart-item">
                  <a [routerLink]="['/shop/product', item.slug]">
                    @if (item.cover) {
                      <img [src]="item.cover" [alt]="item.name" />
                    }
                  </a>
                  <div>
                    <a [routerLink]="['/shop/product', item.slug]" style="font-weight:700">{{
                      item.name
                    }}</a>
                    @if (item.variant) {
                      <p class="text-xs text-muted">
                        {{ item.variant.name }}: {{ item.variant.value }}
                      </p>
                    }
                    <p class="text-sm" style="color:var(--accent);font-weight:700;margin-top:4px">
                      {{ item.price | faNumber }} تومان
                    </p>
                    @if (item.stock <= 5 && item.stock > 0) {
                      <p class="text-xs" style="color:var(--warning)">
                        تنها {{ item.stock | faNumber }} عدد در انبار
                      </p>
                    }
                  </div>
                  <div
                    style="display:flex;flex-direction:column;align-items:flex-end;gap:var(--space-2)"
                  >
                    <div class="qty-control">
                      <button
                        type="button"
                        (click)="changeQty(item.id, item.quantity + 1)"
                        [disabled]="item.quantity >= item.stock"
                      >
                        <app-icon name="plus-circle" [size]="18" />
                      </button>
                      <span>{{ item.quantity | faNumber }}</span>
                      <button
                        type="button"
                        (click)="changeQty(item.id, item.quantity - 1)"
                        [disabled]="item.quantity <= 1"
                      >
                        <app-icon name="close" [size]="16" />
                      </button>
                    </div>
                    <strong>{{ item.total | faNumber }} تومان</strong>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      (click)="removeItem(item.id)"
                    >
                      <app-icon name="trash" [size]="14" /> حذف
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <aside class="summary-card">
            <h3 class="card-title" style="margin-bottom: var(--space-3)">خلاصه سفارش</h3>

            <div class="field">
              <label class="label">کد تخفیف</label>
              <div class="row" style="gap:var(--space-2)">
                <input class="input" [(ngModel)]="couponCode" placeholder="مثلاً WELCOME10" />
                <button
                  type="button"
                  class="btn btn-soft"
                  [disabled]="applyingCoupon()"
                  (click)="applyCoupon()"
                >
                  اعمال
                </button>
              </div>
              @if (couponMessage()) {
                <p
                  class="text-xs"
                  [style.color]="couponApplied() ? 'var(--success)' : 'var(--danger)'"
                >
                  {{ couponMessage() }}
                </p>
              }
            </div>

            <div class="summary-row">
              <span>جمع کالاها</span>
              <span>{{ totals()?.itemsTotal ?? cart().subtotal | faNumber }} تومان</span>
            </div>
            @if ((totals()?.discount ?? 0) > 0) {
              <div class="summary-row is-discount">
                <span>تخفیف</span>
                <span>− {{ totals()!.discount | faNumber }} تومان</span>
              </div>
            }
            <div class="summary-row">
              <span>هزینه ارسال</span>
              <span>
                @if ((totals()?.shippingCost ?? cart().shippingCost) === 0) {
                  رایگان
                } @else {
                  {{ totals()?.shippingCost ?? cart().shippingCost | faNumber }} تومان
                }
              </span>
            </div>
            <div class="summary-row is-total">
              <span>مبلغ قابل پرداخت</span>
              <span>{{ payable() | faNumber }} تومان</span>
            </div>

            <button
              type="button"
              class="btn btn-primary btn-lg btn-block"
              style="margin-top:var(--space-4)"
              (click)="goToCheckout()"
            >
              <app-icon name="credit-card" [size]="18" />
              ادامه و تسویه حساب
            </button>
          </aside>
        </div>
      }
    </div>
  `,
})
export class CartPage {
  protected readonly auth = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly orders = inject(OrderService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly cart = this.cartService.cart;
  protected readonly loading = signal(true);
  protected readonly totals = signal<CartTotals | null>(null);
  protected readonly applyingCoupon = signal(false);
  protected readonly couponMessage = signal('');
  protected readonly couponApplied = signal(false);

  protected couponCode = '';

  protected readonly payable = computed(() => {
    const totals = this.totals();
    if (totals) return totals.payable;
    return this.cart().subtotal + this.cart().shippingCost;
  });

  constructor() {
    this.seo.set({ title: 'سبد خرید' });

    if (this.auth.isLoggedIn()) {
      this.cartService.load().subscribe({
        next: () => this.loading.set(false),
        error: () => this.loading.set(false),
      });
    } else {
      this.loading.set(false);
    }
  }

  protected changeQty(itemId: string, quantity: number): void {
    if (quantity < 1) return;
    this.cartService.updateQuantity(itemId, quantity).subscribe({
      next: () => this.recalculate(),
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  protected removeItem(itemId: string): void {
    this.cartService.removeItem(itemId).subscribe({
      next: () => this.recalculate(),
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  protected clearCart(): void {
    this.cartService.clear().subscribe({
      next: () => {
        this.totals.set(null);
        this.couponMessage.set('');
        this.couponApplied.set(false);
      },
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  protected applyCoupon(): void {
    const code = this.couponCode.trim();
    if (!code) return;

    this.applyingCoupon.set(true);
    this.cartService.validateCoupon(code).subscribe({
      next: (totals) => {
        this.applyingCoupon.set(false);
        this.totals.set(totals);
        this.couponApplied.set(true);
        this.couponMessage.set('کد تخفیف با موفقیت اعمال شد');
        this.toast.success('کد تخفیف اعمال شد');
      },
      error: (error: Error) => {
        this.applyingCoupon.set(false);
        this.couponApplied.set(false);
        this.totals.set(null);
        this.couponMessage.set(error.message);
      },
    });
  }

  protected goToCheckout(): void {
    void this.router.navigate(['/shop/checkout'], {
      queryParams: this.couponApplied() ? { coupon: this.couponCode.trim() } : {},
    });
  }

  private recalculate(): void {
    const totals = this.totals();
    if (!totals) return;
    // Re-validate the coupon against the updated cart.
    if (totals.couponCode) {
      this.cartService.validateCoupon(totals.couponCode).subscribe({
        next: (updated) => this.totals.set(updated),
        error: () => this.totals.set(null),
      });
    }
  }
}
