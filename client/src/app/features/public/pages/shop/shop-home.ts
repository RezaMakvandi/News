import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card';
import { ImageSliderComponent } from '../../../../shared/components/image-slider/image-slider';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { ShopService } from '../../../../core/services/shop.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { CartService } from '../../../../core/services/cart.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import type { FeaturedProducts, ProductCategory } from '../../../../core/models/product.model';
import type { HomeSection } from '../../../../core/models/home-layout.model';

@Component({
  selector: 'app-shop-home',
  imports: [RouterLink, IconComponent, ProductCardComponent, SpinnerComponent, FaNumberPipe, ImageSliderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      @if (loading()) {
        <app-spinner label="در حال بارگذاری فروشگاه..." />
      } @else {
        @for (section of sections(); track section.id) {
          @switch (section.type === 'products' ? 'products' : section.type) {
            @case ('image_slider') {
              @if (section.slides?.length) {
                <section style="margin-bottom: var(--space-6)">
                  <app-image-slider
                    [slides]="section.slides ?? []"
                    [loop]="section.loop !== false"
                    [interval]="section.interval ?? 4000"
                  />
                </section>
              }
            }
            @case ('slider') {
              @if (section.slides?.length) {
                <section style="margin-bottom: var(--space-6)">
                  <app-image-slider
                    [slides]="section.slides ?? []"
                    [loop]="section.loop !== false"
                    [interval]="section.interval ?? 4000"
                  />
                </section>
              }
            }
            @case ('shop_banner') {
              <section class="shop-hero" style="margin-bottom: var(--space-6)">
                <h1>{{ section.title || 'فروشگاه کالای دیجیتال' }}</h1>
                <p>
                  {{ section.subtitle || 'جدیدترین گوشیها، لپتاپها، هدفون و لوازم جانبی اورجینال با گارانتی معتبر و ارسال سریع به سراسر کشور.' }}
                </p>
                <div class="shop-hero-actions">
                  <a
                    class="btn btn-lg"
                    [routerLink]="section.ctaHref || '/shop/products'"
                    style="background:#fff;color:var(--accent)"
                  >
                    <app-icon name="store" [size]="18" />
                    {{ section.ctaLabel || 'مشاهده همه محصولات' }}
                  </a>
                </div>
              </section>
            }
            @case ('product_categories') {
              @if (categories().length) {
                <section style="margin-bottom: var(--space-6)">
                  <div class="shop-section-head">
                    <h2>{{ section.title || 'دسته بندیها' }}</h2>
                  </div>
                  <div class="category-tiles">
                    @for (category of visibleCategories(section); track category._id) {
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
            }
            @case ('products') {
              @if (productsFor(section).length) {
                <section style="margin-bottom: var(--space-6)">
                  <div class="shop-section-head">
                    <h2>{{ section.title || productTitle(section) }}</h2>
                    @if (section.showCta && section.ctaHref) {
                      <a [routerLink]="section.ctaHref">{{ section.ctaLabel || 'مشاهده همه' }}</a>
                    }
                  </div>
                  <div class="product-grid">
                    @for (product of productsFor(section); track product._id) {
                      <app-product-card [product]="product" (wishlistToggled)="toggleWishlist($event)" />
                    }
                  </div>
                </section>
              }
            }
          }
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
  private readonly settings = inject(SettingsService);

  protected readonly loading = signal(true);
  protected readonly data = signal<FeaturedProducts | null>(null);
  protected readonly categories = signal<ProductCategory[]>([]);

  protected readonly sections = computed(() => {
    return this.settings.shopHomeLayout().filter((section) => section.enabled !== false);
  });

  constructor() {
    this.settings.load().subscribe({
      next: () => {},
      error: () => {},
    });
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

  protected productsFor(section: HomeSection): any[] {
    const data = this.data();
    if (!data) return [];
    let items: any[] = [];
    if (section.onSale) items = data.onSale ?? [];
    else if (section.featured) items = data.featured ?? [];
    else if (section.sort === 'popular') items = data.bestSellers ?? [];
    else items = data.latest ?? [];
    const limit = this.clamp(section.limit, 4);
    return items.slice(0, limit);
  }

  protected visibleCategories(section: HomeSection): ProductCategory[] {
    const limit = this.clamp(section.limit, 8);
    return this.categories().slice(0, limit);
  }

  protected productTitle(section: HomeSection): string {
    if (section.sort === 'popular') return 'پرفروشترینها';
    if (section.onSale) return 'تخفیفدارها';
    if (section.featured) return 'پیشنهاد ویژه';
    return 'جدیدترین محصولات';
  }

  protected toggleWishlist(productId: string): void {
    this.cart.toggleWishlist(productId).subscribe({
      next: (result) =>
        this.toast.success(result.wishlisted ? 'به علاقه مندیها اضافه شد' : 'از علاقه مندیها حذف شد'),
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  private clamp(value: number | undefined, fallback: number): number {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    return Math.min(24, Math.floor(num));
  }
}