import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { ShopService } from '../../../../core/services/shop.service';
import { CartService } from '../../../../core/services/cart.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import type { FeaturedProducts, ProductCategory } from '../../../../core/models/product.model';

@Component({
  selector: 'app-shop-home',
  imports: [RouterLink, IconComponent, ProductCardComponent, SpinnerComponent, FaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <section class="shop-hero">
        <h1>فروشگاه کالای دیجیتال</h1>
        <p>
          جدیدترین گوشیها، لپتاپها، هدفون و لوازم جانبی اورجینال با گارانتی معتبر و ارسال سریع به
          سراسر کشور.
        </p>
        <div class="shop-hero-actions">
          <a
            class="btn btn-lg"
            routerLink="/shop/products"
            style="background:#fff;color:var(--accent)"
          >
            <app-icon name="store" [size]="18" />
            مشاهده همه محصولات
          </a>
          <a
            class="btn btn-lg btn-outline"
            routerLink="/shop/products"
            [queryParams]="{ onSale: true }"
            style="border-color:rgba(255,255,255,.6);color:#fff"
          >
            <app-icon name="percent" [size]="18" />
            تخفیفهای ویژه
          </a>
        </div>
      </section>

      @if (loading()) {
        <app-spinner label="در حال بارگذاری فروشگاه..." />
      } @else {
        @if (categories().length) {
          <section style="margin-bottom: var(--space-6)">
            <div class="shop-section-head">
              <h2>دستهبندیها</h2>
            </div>
            <div class="category-tiles">
              @for (category of categories(); track category._id) {
                <a
                  class="category-tile"
                  [routerLink]="['/shop/products']"
                  [queryParams]="{ category: category.slug }"
                >
                  <span class="tile-icon"
                    ><app-icon [name]="category.icon || 'package'" [size]="24"
                  /></span>
                  <span class="tile-name">{{ category.name }}</span>
                  <span class="tile-count">{{ category.productsCount || 0 | faNumber }} کالا</span>
                </a>
              }
            </div>
          </section>
        }

        @if (data()?.featured?.length) {
          <section style="margin-bottom: var(--space-6)">
            <div class="shop-section-head">
              <h2>پیشنهاد ویژه</h2>
              <a routerLink="/shop/products" [queryParams]="{ featured: true }">مشاهده همه</a>
            </div>
            <div class="product-grid">
              @for (product of data()!.featured; track product._id) {
                <app-product-card [product]="product" (wishlistToggled)="toggleWishlist($event)" />
              }
            </div>
          </section>
        }

        @if (data()?.onSale?.length) {
          <section style="margin-bottom: var(--space-6)">
            <div class="shop-section-head">
              <h2>تخفیفدارها</h2>
              <a routerLink="/shop/products" [queryParams]="{ onSale: true }">مشاهده همه</a>
            </div>
            <div class="product-grid">
              @for (product of data()!.onSale; track product._id) {
                <app-product-card [product]="product" (wishlistToggled)="toggleWishlist($event)" />
              }
            </div>
          </section>
        }

        @if (data()?.bestSellers?.length) {
          <section style="margin-bottom: var(--space-6)">
            <div class="shop-section-head">
              <h2>پرفروشترینها</h2>
              <a routerLink="/shop/products" [queryParams]="{ sort: 'popular' }">مشاهده همه</a>
            </div>
            <div class="product-grid">
              @for (product of data()!.bestSellers; track product._id) {
                <app-product-card [product]="product" (wishlistToggled)="toggleWishlist($event)" />
              }
            </div>
          </section>
        }

        @if (data()?.latest?.length) {
          <section>
            <div class="shop-section-head">
              <h2>جدیدترین محصولات</h2>
              <a routerLink="/shop/products">مشاهده همه</a>
            </div>
            <div class="product-grid">
              @for (product of data()!.latest; track product._id) {
                <app-product-card [product]="product" (wishlistToggled)="toggleWishlist($event)" />
              }
            </div>
          </section>
        }
      }
    </div>
  `,
})
export class ShopHomePage {
  private readonly shop = inject(ShopService);
  private readonly cart = inject(CartService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly data = signal<FeaturedProducts | null>(null);
  protected readonly categories = signal<ProductCategory[]>([]);

  constructor() {
    this.seo.set({
      title: 'فروشگاه کالای دیجیتال',
      description: 'خرید آنلاین گوشی، لپتاپ، هدفون و لوازم جانبی دیجیتال با گارانتی و ارسال سریع.',
    });

    this.shop.featured().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.shop.categories().subscribe({
      next: (categories) => this.categories.set(categories ?? []),
      error: () => this.categories.set([]),
    });
  }

  protected toggleWishlist(productId: string): void {
    this.cart.toggleWishlist(productId).subscribe({
      next: (result) =>
        this.toast.success(result.wishlisted ? 'به علاقهمندیها اضافه شد' : 'از علاقهمندیها حذف شد'),
      error: (error: Error) => this.toast.error(error.message),
    });
  }
}
