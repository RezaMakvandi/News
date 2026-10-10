import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon';
import { StarsComponent } from '../stars/stars';
import { FaNumberPipe } from '../../pipes/format.pipe';
import type { ProductCard } from '../../../core/models/product.model';
import { asBrand, discountPercent, finalPrice } from '../../../core/utils/shop';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

type ProductLike = ProductCard;

/** Product tile used across grids, carousels and search results. */
@Component({
  selector: 'app-product-card',
  imports: [RouterLink, IconComponent, StarsComponent, FaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="product-card">
      <a class="product-thumb" [routerLink]="['/shop/product', product().slug]">
        @if (product().cover) {
          <img [src]="product().cover" [alt]="product().name" loading="lazy" decoding="async" />
        } @else {
          <span class="thumb-placeholder"><app-icon name="image" [size]="34" /></span>
        }

        @if (discount() > 0) {
          <span class="thumb-badge discount">٪{{ discount() | faNumber }} تخفیف</span>
        }
        @if (product().isNewArrival) {
          <span class="thumb-badge is-new">جدید</span>
        }
        @if (product().stock === 0) {
          <span class="thumb-out">ناموجود</span>
        }
      </a>

      <button
        type="button"
        class="wishlist-btn"
        [class.is-on]="wishlisted()"
        (click)="onWishlist($event)"
        [attr.aria-label]="wishlisted() ? 'حذف از علاقهمندیها' : 'افزودن به علاقهمندیها'"
      >
        <app-icon [name]="wishlisted() ? 'heart-filled' : 'heart'" [size]="17" />
      </button>

      <div class="product-body">
        @if (brand()) {
          <span class="product-brand">{{ brand()!.name }}</span>
        }
        <a class="product-name clamp-2" [routerLink]="['/shop/product', product().slug]">
          {{ product().name }}
        </a>

        <div class="product-rating">
          <app-stars [value]="product().rating || 0" [size]="13" />
          <span class="text-xs text-muted">({{ product().ratingCount || 0 | faNumber }})</span>
        </div>

        <div class="product-price">
          @if (discount() > 0) {
            <span class="price-old">{{ product().price | faNumber }} تومان</span>
          }
          <span class="price-final">{{ final() | faNumber }} تومان</span>
        </div>

        @if (product().stock > 0) {
          <button type="button" class="btn btn-primary btn-sm add-btn" (click)="onAdd($event)">
            <app-icon name="cart" [size]="15" />
            افزودن به سبد
          </button>
        } @else {
          <button type="button" class="btn btn-soft btn-sm add-btn" disabled>ناموجود</button>
        }
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class ProductCardComponent {
  readonly product = input.required<ProductLike>();
  readonly wishlisted = input(false);
  readonly added = output<{ productId: string; quantity: number }>();
  readonly wishlistToggled = output<string>();

  private readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly brand = computed(() => asBrand(this.product().brand));
  protected readonly discount = computed(() => discountPercent(this.product()));
  protected readonly final = computed(() => finalPrice(this.product()));

  protected onAdd(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const product = this.product();
    if (!this.auth.isLoggedIn()) {
      this.cart.saveLocal(product._id, 1);
      this.toast.info('برای نهایی کردن خرید وارد حساب خود شوید');
    } else {
      this.cart
        .add(product._id, 1)
        .subscribe({ error: (error: Error) => this.toast.error(error.message) });
    }
    this.added.emit({ productId: product._id, quantity: 1 });
  }

  protected onWishlist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.auth.isLoggedIn()) {
      this.toast.warning('برای افزودن به علاقهمندیها وارد حساب خود شوید');
      return;
    }
    this.wishlistToggled.emit(this.product()._id);
  }
}
