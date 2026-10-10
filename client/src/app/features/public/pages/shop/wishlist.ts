import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { CartService } from '../../../../core/services/cart.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import type { ProductCard } from '../../../../core/models/product.model';

@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, IconComponent, ProductCardComponent, SpinnerComponent, FaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <div class="admin-page-head" style="margin-bottom:var(--space-5)">
        <div>
          <h1><app-icon name="heart" [size]="22" /> علاقهمندیها</h1>
          <p class="text-sm text-muted">
            {{ products().length | faNumber }} کالا در لیست علاقهمندی شما.
          </p>
        </div>
      </div>

      @if (loading()) {
        <app-spinner label="در حال بارگذاری..." />
      } @else if (products().length) {
        <div class="product-grid">
          @for (product of products(); track product._id) {
            <app-product-card
              [product]="product"
              [wishlisted]="true"
              (wishlistToggled)="remove($event)"
            />
          }
        </div>
      } @else {
        <div class="shop-empty">
          <div class="shop-empty-icon"><app-icon name="heart" [size]="40" /></div>
          <h2>لیست علاقهمندیها خالی است</h2>
          <p class="text-muted">محصولات مورد علاقه خود را با زدن آیکون قلب ذخیره کنید.</p>
          <a class="btn btn-primary" routerLink="/shop/products">مشاهده محصولات</a>
        </div>
      }
    </div>
  `,
})
export class WishlistPage {
  private readonly cart = inject(CartService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  protected readonly products = signal<ProductCard[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    this.seo.set({ title: 'علاقهمندیها' });
    this.load();
  }

  protected remove(productId: string): void {
    this.cart.toggleWishlist(productId).subscribe({
      next: () => {
        this.products.update((list) => list.filter((item) => item._id !== productId));
        this.toast.info('از علاقهمندیها حذف شد');
      },
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  private load(): void {
    this.cart.wishlist().subscribe({
      next: (items) => {
        this.products.set(items ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
