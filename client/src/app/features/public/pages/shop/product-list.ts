import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ShopService } from '../../../../core/services/shop.service';
import { CartService } from '../../../../core/services/cart.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import {
  PRODUCT_SORT_OPTIONS,
  type BrandRef,
  type ProductCard,
  type ProductCategory,
  type ProductFacets,
} from '../../../../core/models/product.model';
@Component({
  selector: 'app-product-list',
  imports: [
    FormsModule,
    RouterLink,
    IconComponent,
    ProductCardComponent,
    PaginationComponent,
    SpinnerComponent,
    EmptyStateComponent,
    FaNumberPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <div class="breadcrumb" style="margin-bottom: var(--space-3)">
        <a routerLink="/">صفحه اصلی</a>
        <span class="sep">/</span>
        <a routerLink="/shop">فروشگاه</a>
        <span class="sep">/</span>
        <span>{{ heading() }}</span>
      </div>

      <div class="shop-layout">
        <aside class="shop-sidebar">
          <div class="filter-group">
            <h4>جستجو</h4>
            <div class="input-search">
              <app-icon name="search" [size]="16" />
              <input
                class="input"
                type="search"
                placeholder="نام محصول..."
                [(ngModel)]="searchTerm"
                (keydown.enter)="applySearch()"
              />
            </div>
          </div>

          @if (categories().length) {
            <div class="filter-group">
              <h4>دستهبندی</h4>
              <div class="filter-list">
                <label>
                  <input
                    type="radio"
                    name="cat"
                    [checked]="!selectedCategory()"
                    (change)="setCategory('')"
                  />
                  همه دستهها
                </label>
                @for (category of categories(); track category._id) {
                  <label>
                    <input
                      type="radio"
                      name="cat"
                      [checked]="selectedCategory() === category.slug"
                      (change)="setCategory(category.slug)"
                    />
                    {{ category.name }}
                    <span class="text-xs text-muted"
                      >({{ category.productsCount || 0 | faNumber }})</span
                    >
                  </label>
                }
              </div>
            </div>
          }

          @if (brands().length) {
            <div class="filter-group">
              <h4>برند</h4>
              <div class="filter-list">
                <label>
                  <input
                    type="radio"
                    name="brand"
                    [checked]="!selectedBrand()"
                    (change)="setBrand('')"
                  />
                  همه برندها
                </label>
                @for (brand of brands(); track brand._id) {
                  <label>
                    <input
                      type="radio"
                      name="brand"
                      [checked]="selectedBrand() === brand.slug"
                      (change)="setBrand(brand.slug)"
                    />
                    {{ brand.name }}
                    <span class="text-xs text-muted"
                      >({{ brand.productsCount || 0 | faNumber }})</span
                    >
                  </label>
                }
              </div>
            </div>
          }

          <div class="filter-group">
            <h4>محدوده قیمت (تومان)</h4>
            <div class="price-inputs">
              <input
                class="input"
                type="number"
                placeholder="از"
                [(ngModel)]="minPrice"
                (change)="applyPrice()"
              />
              <span>—</span>
              <input
                class="input"
                type="number"
                placeholder="تا"
                [(ngModel)]="maxPrice"
                (change)="applyPrice()"
              />
            </div>
          </div>

          <div class="filter-group">
            <h4>فیلترها</h4>
            <div class="filter-list">
              <label class="checkbox">
                <input type="checkbox" [checked]="inStock()" (change)="toggleInStock()" />
                فقط کالاهای موجود
              </label>
              <label class="checkbox">
                <input type="checkbox" [checked]="onSaleFilter()" (change)="toggleOnSale()" />
                فقط تخفیفدار
              </label>
            </div>
          </div>

          <button type="button" class="btn btn-outline btn-block" (click)="resetFilters()">
            <app-icon name="refresh" [size]="16" />
            حذف فیلترها
          </button>
        </aside>

        <div>
          <div
            class="row"
            style="justify-content: space-between; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-3)"
          >
            <span class="text-sm text-muted">{{ total() | faNumber }} کالا یافت شد</span>
            <div class="row" style="gap: var(--space-2)">
              <select
                class="select"
                style="width:170px"
                [ngModel]="sort()"
                (ngModelChange)="setSort($event)"
              >
                @for (option of sortOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </div>
          </div>

          @if (loading()) {
            <app-spinner label="در حال بارگذاری محصولات..." />
          } @else if (products().length) {
            <div class="product-grid">
              @for (product of products(); track product._id) {
                <app-product-card [product]="product" (wishlistToggled)="toggleWishlist($event)" />
              }
            </div>

            <div class="row" style="justify-content: center; margin-top: var(--space-6)">
              <app-pagination
                [page]="page()"
                [totalPages]="totalPages()"
                (pageChange)="goToPage($event)"
              />
            </div>
          } @else {
            <app-empty-state
              icon="search"
              title="محصولی یافت نشد"
              description="فیلترها را تغییر دهید یا عبارت جستجوی دیگری امتحان کنید."
              actionLabel="حذف فیلترها"
              actionIcon="refresh"
              (action)="resetFilters()"
            />
          }
        </div>
      </div>
    </div>
  `,
})
export class ProductListPage {
  /** Bound from query params via component input binding. */
  readonly category = input('');
  readonly brand = input('');
  readonly q = input('');
  readonly sort = input('newest');
  readonly onSale = input<string | boolean>('');

  private readonly shop = inject(ShopService);
  private readonly cart = inject(CartService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly products = signal<ProductCard[]>([]);
  protected readonly categories = signal<ProductCategory[]>([]);
  protected readonly brands = signal<(BrandRef & { productsCount?: number })[]>([]);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(1);

  protected readonly selectedCategory = signal('');
  protected readonly selectedBrand = signal('');
  protected readonly inStock = signal(false);
  protected readonly onSaleFilter = signal(false);
  protected readonly sortValue = signal('newest');

  protected searchTerm = '';
  protected minPrice: number | null = null;
  protected maxPrice: number | null = null;

  protected readonly sortOptions = PRODUCT_SORT_OPTIONS;

  constructor() {
    this.seo.set({ title: 'فروشگاه | لیست محصولات' });

    this.shop
      .categories()
      .subscribe({ next: (list) => this.categories.set(list ?? []), error: () => undefined });
    this.shop.facets().subscribe({
      next: (facets) =>
        this.brands.set(
          (facets.brands ?? [])
            .filter((item): item is { _id: string; count: number; brand: BrandRef } =>
              Boolean(item.brand),
            )
            .map((item) => ({ ...item.brand, productsCount: item.count })),
        ),
      error: () => undefined,
    });

    // Sync component inputs → local filter state, then (re)load.
    effect(() => {
      this.selectedCategory.set(this.category() || '');
      this.selectedBrand.set(this.brand() || '');
      this.searchTerm = this.q() || '';
      this.sortValue.set(this.sort() || 'newest');
      this.onSaleFilter.set(this.onSale() === true || this.onSale() === 'true');
      this.page.set(1);
      this.load();
    });
  }

  protected heading(): string {
    const category = this.categories().find((item) => item.slug === this.selectedCategory());
    if (category) return category.name;
    if (this.searchTerm) return `جستجو: ${this.searchTerm}`;
    return 'همه محصولات';
  }

  protected setCategory(slug: string): void {
    this.navigate({ category: slug || undefined, page: undefined });
  }

  protected setBrand(slug: string): void {
    this.navigate({ brand: slug || undefined, page: undefined });
  }

  protected setSort(value: string): void {
    this.navigate({ sort: value });
  }

  protected applySearch(): void {
    this.navigate({ q: this.searchTerm.trim() || undefined, page: undefined });
  }

  protected applyPrice(): void {
    this.page.set(1);
    this.load();
  }

  protected toggleInStock(): void {
    this.inStock.update((value) => !value);
    this.page.set(1);
    this.load();
  }

  protected toggleOnSale(): void {
    this.onSaleFilter.update((value) => !value);
    this.page.set(1);
    this.load();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.inStock.set(false);
    this.onSaleFilter.set(false);
    void this.router.navigate(['/shop/products']);
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected toggleWishlist(productId: string): void {
    this.cart.toggleWishlist(productId).subscribe({
      next: (result) =>
        this.toast.success(result.wishlisted ? 'به علاقهمندیها اضافه شد' : 'از علاقهمندیها حذف شد'),
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  private navigate(query: Record<string, string | number | undefined>): void {
    void this.router.navigate(['/shop/products'], {
      queryParams: query,
      queryParamsHandling: 'merge',
    });
  }

  private load(): void {
    this.loading.set(true);
    this.shop
      .list({
        page: this.page(),
        limit: 24,
        category: this.selectedCategory() || undefined,
        brand: this.selectedBrand() || undefined,
        q: this.searchTerm.trim() || undefined,
        sort: this.sortValue(),
        inStock: this.inStock() || undefined,
        onSale: this.onSaleFilter() || undefined,
        minPrice: this.minPrice ?? undefined,
        maxPrice: this.maxPrice ?? undefined,
      })
      .subscribe({
        next: (result) => {
          this.products.set(result.items ?? []);
          this.total.set(result.meta?.total ?? 0);
          this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
          this.loading.set(false);
        },
        error: () => {
          this.products.set([]);
          this.loading.set(false);
        },
      });
  }
}
