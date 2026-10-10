import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card';
import { StarsComponent } from '../../../../shared/components/stars/stars';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { ShopService } from '../../../../core/services/shop.service';
import { CartService } from '../../../../core/services/cart.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe, FaDatePipe } from '../../../../shared/pipes/format.pipe';
import type {
  Product,
  ProductDetailResponse,
  ProductReview,
  ProductVariant,
} from '../../../../core/models/product.model';
import {
  asBrand,
  asProductCategory,
  discountPercent,
  finalPrice,
  toman,
} from '../../../../core/utils/shop';

@Component({
  selector: 'app-product-detail',
  imports: [
    FormsModule,
    RouterLink,
    IconComponent,
    ProductCardComponent,
    StarsComponent,
    SpinnerComponent,
    FaNumberPipe,
    FaDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      @if (loading()) {
        <app-spinner label="در حال بارگذاری محصول..." />
      } @else if (product(); as item) {
        <div class="breadcrumb" style="margin-bottom: var(--space-4)">
          <a routerLink="/">صفحه اصلی</a>
          <span class="sep">/</span>
          <a routerLink="/shop">فروشگاه</a>
          @if (categoryName()) {
            <span class="sep">/</span>
            <a [routerLink]="['/shop/products']" [queryParams]="{ category: category()!.slug }">{{
              categoryName()
            }}</a>
          }
          <span class="sep">/</span>
          <span class="clamp-1">{{ item.name }}</span>
        </div>

        <div class="product-detail">
          <!-- Gallery -->
          <div class="product-gallery">
            <div class="gallery-main">
              @if (activeImage()) {
                <img [src]="activeImage()" [alt]="item.name" />
              } @else {
                <div style="display:grid;place-items:center;height:100%;color:var(--text-faint)">
                  <app-icon name="image" [size]="48" />
                </div>
              }
            </div>
            @if (item.images.length > 1) {
              <div class="gallery-thumbs">
                @for (image of item.images; track $index) {
                  <button
                    type="button"
                    [class.is-active]="activeIndex() === $index"
                    (click)="activeIndex.set($index)"
                    [attr.aria-label]="'تصویر ' + ($index + 1)"
                  >
                    <img [src]="image.url" [alt]="image.alt || item.name" />
                  </button>
                }
              </div>
            }
          </div>

          <!-- Info -->
          <div class="product-info">
            @if (brand()) {
              <a
                class="badge badge-accent"
                [routerLink]="['/shop/products']"
                [queryParams]="{ brand: brand()!.slug }"
                style="align-self:flex-start"
              >
                {{ brand()!.name }}
              </a>
            }
            <h1>{{ item.name }}</h1>

            <div class="row" style="gap: var(--space-4)">
              <div class="row" style="gap:6px">
                <app-stars [value]="item.rating || 0" [size]="16" />
                <span class="text-sm text-muted"
                  >{{ item.rating || 0 | faNumber }} ({{ item.ratingCount | faNumber }} نظر)</span
                >
              </div>
              <span class="text-sm text-muted">
                <app-icon name="package" [size]="14" />
                {{ item.soldCount | faNumber }} فروش
              </span>
            </div>

            @if (item.summary) {
              <p class="text-sm text-muted" style="line-height:2">{{ item.summary }}</p>
            }

            <!-- Variants -->
            @if (variantGroups().length) {
              @for (group of variantGroups(); track group.name) {
                <div class="variant-group">
                  <span class="variant-label">{{ group.name }}</span>
                  <div class="variant-options">
                    @for (option of group.options; track option.value) {
                      <button
                        type="button"
                        class="chip"
                        [class.is-active]="selectedVariant(group.name) === option.value"
                        [disabled]="option.stock === 0"
                        (click)="selectVariant(group.name, option)"
                      >
                        {{ option.value }}
                        @if (option.stock === 0) {
                          <span>(ناموجود)</span>
                        }
                      </button>
                    }
                  </div>
                </div>
              }
            }

            <!-- Price -->
            <div class="product-price-box">
              @if (discount() > 0) {
                <div class="price-row">
                  <span class="price-old">{{ item.price | faNumber }} تومان</span>
                  <span class="badge badge-danger">٪{{ discount() | faNumber }} تخفیف</span>
                </div>
              }
              <div class="price-row">
                <span class="price-final">{{ currentPrice() | faNumber }} تومان</span>
              </div>
              @if (item.warranty) {
                <span class="text-xs text-muted">
                  <app-icon name="check-circle" [size]="14" /> {{ item.warranty }}
                </span>
              }
            </div>

            <!-- Actions -->
            <div class="row" style="gap: var(--space-3); flex-wrap: wrap">
              @if (totalStock() > 0) {
                <button type="button" class="btn btn-primary btn-lg grow" (click)="addToCart()">
                  <app-icon name="cart" [size]="18" />
                  افزودن به سبد خرید
                </button>
              } @else {
                <button type="button" class="btn btn-soft btn-lg grow" disabled>ناموجود</button>
              }
              <button
                type="button"
                class="btn btn-outline btn-lg"
                (click)="toggleWishlist()"
                [attr.aria-label]="'علاقهمندی'"
              >
                <app-icon name="heart" [size]="18" />
              </button>
              <button
                type="button"
                class="btn btn-outline btn-lg"
                (click)="toggleCompare()"
                [attr.aria-label]="'مقایسه'"
              >
                <app-icon name="git-compare" [size]="18" />
              </button>
            </div>

            @if (item.shippingNote) {
              <div class="card card-pad" style="display:flex;gap:var(--space-3);align-items:center">
                <app-icon name="truck" [size]="22" />
                <span class="text-sm">{{ item.shippingNote }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Tabs: specs & reviews -->
        <div class="card" style="margin-top: var(--space-6)">
          <div
            class="tabs"
            style="display:flex;gap:var(--space-2);padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--border)"
          >
            <button
              type="button"
              class="chip"
              [class.is-active]="tab() === 'specs'"
              (click)="tab.set('specs')"
            >
              مشخصات فنی
            </button>
            <button
              type="button"
              class="chip"
              [class.is-active]="tab() === 'description'"
              (click)="tab.set('description')"
            >
              توضیحات
            </button>
            <button
              type="button"
              class="chip"
              [class.is-active]="tab() === 'reviews'"
              (click)="tab.set('reviews')"
            >
              نظرات ({{ item.ratingCount | faNumber }})
            </button>
          </div>

          <div class="card-body">
            @if (tab() === 'specs') {
              @if (item.specs.length) {
                <div style="overflow-x:auto">
                  <table class="spec-table">
                    <tbody>
                      @for (spec of item.specs; track $index) {
                        <tr>
                          <th>{{ spec.name }}</th>
                          <td>{{ spec.value }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <p class="text-muted">مشخصات فنی برای این محصول ثبت نشده است.</p>
              }
            }

            @if (tab() === 'description') {
              <div class="prose" [innerHTML]="item.description"></div>
            }

            @if (tab() === 'reviews') {
              <div class="row" style="gap:var(--space-6);align-items:flex-start;flex-wrap:wrap">
                <div style="min-width:220px">
                  <div style="text-align:center">
                    <div style="font-size:2.4rem;font-weight:800">
                      {{ item.rating || 0 | faNumber }}
                    </div>
                    <app-stars [value]="item.rating || 0" [size]="18" />
                    <p class="text-xs text-muted">از {{ item.ratingCount | faNumber }} نظر</p>
                  </div>
                  <div class="rating-bars" style="margin-top:var(--space-4)">
                    @for (star of [5, 4, 3, 2, 1]; track star) {
                      <div class="rating-bar">
                        <span>{{ star | faNumber }}</span>
                        <span class="bar">
                          <span [style.width.%]="histogramPercent(star)"></span>
                        </span>
                        <span>{{ histogram()[star] || 0 | faNumber }}</span>
                      </div>
                    }
                  </div>
                </div>

                <div class="grow" style="min-width:280px">
                  @if (canReview()) {
                    <div class="card card-pad" style="margin-bottom:var(--space-4)">
                      <h4 class="card-title" style="margin-bottom:var(--space-3)">ثبت نظر</h4>
                      <div class="field">
                        <label class="label">امتیاز شما</label>
                        <div class="row" style="gap:4px">
                          @for (star of [1, 2, 3, 4, 5]; track star) {
                            <button
                              type="button"
                              class="btn btn-icon"
                              (click)="reviewForm.rating = star"
                            >
                              <app-icon
                                [name]="star <= reviewForm.rating ? 'star-filled' : 'star'"
                                [size]="22"
                              />
                            </button>
                          }
                        </div>
                      </div>
                      <div class="field">
                        <label class="label">عنوان</label>
                        <input
                          class="input"
                          [(ngModel)]="reviewForm.title"
                          placeholder="خلاصه نظر"
                        />
                      </div>
                      <div class="field">
                        <label class="label">متن نظر <span class="req">*</span></label>
                        <textarea
                          class="textarea"
                          rows="3"
                          [(ngModel)]="reviewForm.comment"
                          placeholder="تجربه خود را بنویسید..."
                        ></textarea>
                      </div>
                      <button
                        type="button"
                        class="btn btn-primary"
                        [disabled]="submitting()"
                        (click)="submitReview()"
                      >
                        ثبت نظر
                      </button>
                    </div>
                  } @else if (auth.isLoggedIn()) {
                    <p class="text-sm text-muted" style="margin-bottom:var(--space-3)">
                      شما قبلاً برای این محصول نظر ثبت کردهاید.
                    </p>
                  } @else {
                    <p class="text-sm text-muted" style="margin-bottom:var(--space-3)">
                      برای ثبت نظر ابتدا <a routerLink="/admin/login">وارد حساب</a> شوید.
                    </p>
                  }

                  @if (reviews().length) {
                    @for (review of reviews(); track review._id) {
                      <div class="review-item">
                        <div
                          class="row"
                          style="justify-content:space-between;align-items:flex-start"
                        >
                          <div class="row" style="gap:var(--space-3)">
                            <span class="avatar-fallback">{{
                              review.user.name.charAt(0) || '؟'
                            }}</span>
                            <div>
                              <strong style="font-size:0.9rem">{{
                                review.user.name || 'کاربر'
                              }}</strong>
                              <div class="row" style="gap:var(--space-2)">
                                <app-stars [value]="review.rating" [size]="13" />
                                @if (review.isVerifiedPurchase) {
                                  <span class="badge badge-success">خرید تأییدشده</span>
                                }
                              </div>
                            </div>
                          </div>
                          <span class="text-xs text-muted">{{
                            review.createdAt | faDate: 'relative'
                          }}</span>
                        </div>
                        @if (review.title) {
                          <p style="font-weight:700;margin-top:var(--space-2)">
                            {{ review.title }}
                          </p>
                        }
                        <p class="text-sm" style="margin-top:4px;line-height:2">
                          {{ review.comment }}
                        </p>
                        @if (review.pros.length || review.cons.length) {
                          <div class="review-pros-cons">
                            @if (review.pros.length) {
                              <div class="pros">
                                <h5>نقاط قوت</h5>
                                <ul>
                                  @for (pro of review.pros; track pro) {
                                    <li>{{ pro }}</li>
                                  }
                                </ul>
                              </div>
                            }
                            @if (review.cons.length) {
                              <div class="cons">
                                <h5>نقاط ضعف</h5>
                                <ul>
                                  @for (con of review.cons; track con) {
                                    <li>{{ con }}</li>
                                  }
                                </ul>
                              </div>
                            }
                          </div>
                        }
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm"
                          style="margin-top:var(--space-2)"
                          (click)="markHelpful(review)"
                        >
                          <app-icon name="heart" [size]="14" />
                          مفید بود ({{ review.helpfulCount | faNumber }})
                        </button>
                      </div>
                    }
                  } @else {
                    <p class="text-muted">هنوز نظری ثبت نشده است.</p>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        @if (data()?.related?.length) {
          <section style="margin-top: var(--space-6)">
            <div class="shop-section-head"><h2>محصولات مشابه</h2></div>
            <div class="product-grid">
              @for (rel of data()!.related; track rel._id) {
                <app-product-card [product]="rel" (wishlistToggled)="toggleWishlistById($event)" />
              }
            </div>
          </section>
        }
      } @else {
        <div class="shop-empty">
          <div class="shop-empty-icon"><app-icon name="package" [size]="40" /></div>
          <h2>محصول یافت نشد</h2>
          <a class="btn btn-primary" routerLink="/shop">بازگشت به فروشگاه</a>
        </div>
      }
    </div>
  `,
  styles: `
    .avatar-fallback {
      width: 38px;
      height: 38px;
      flex: none;
      border-radius: var(--radius-full);
      background: var(--accent-soft);
      color: var(--accent);
      display: grid;
      place-items: center;
      font-weight: 700;
    }
  `,
})
export class ProductDetailPage {
  /** Bound from the `shop/product/:slug` route parameter. */
  readonly slug = input('');

  private readonly shop = inject(ShopService);
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly data = signal<ProductDetailResponse | null>(null);
  protected readonly reviews = signal<ProductReview[]>([]);
  protected readonly activeIndex = signal(0);
  protected readonly tab = signal<'specs' | 'description' | 'reviews'>('specs');
  protected readonly submitting = signal(false);
  protected readonly selectedVariants = signal<Record<string, ProductVariant>>({});

  protected reviewForm = { rating: 5, title: '', comment: '' };

  protected readonly product = computed(() => this.data()?.product ?? null);
  protected readonly brand = computed(() => asBrand(this.product()?.brand));
  protected readonly category = computed(() => asProductCategory(this.product()?.category));
  protected readonly categoryName = computed(() => this.category()?.name ?? '');
  protected readonly discount = computed(() =>
    this.product() ? discountPercent(this.product()!) : 0,
  );
  protected readonly activeImage = computed(() => {
    const images = this.product()?.images ?? [];
    return images[this.activeIndex()]?.url ?? this.product()?.cover ?? '';
  });
  protected readonly histogram = computed(() => this.data()?.ratingHistogram ?? {});
  protected readonly canReview = computed(() => this.data()?.canReview ?? false);

  /** Groups flat variants into `{ name, options[] }`. */
  protected readonly variantGroups = computed(() => {
    const variants = this.product()?.variants ?? [];
    const map = new Map<string, ProductVariant[]>();
    for (const variant of variants) {
      const list = map.get(variant.name) ?? [];
      list.push(variant);
      map.set(variant.name, list);
    }
    return [...map.entries()].map(([name, options]) => ({ name, options }));
  });

  protected readonly currentPrice = computed(() => {
    const item = this.product();
    if (!item) return 0;
    let price = finalPrice(item);
    for (const variant of Object.values(this.selectedVariants())) {
      price += variant.priceDelta ?? 0;
    }
    return price;
  });

  protected readonly totalStock = computed(() => {
    const item = this.product();
    if (!item) return 0;
    const selected = Object.values(this.selectedVariants());
    if (selected.length > 0) return Math.min(...selected.map((variant) => variant.stock));
    return item.stock;
  });

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (!slug) return;

      this.loading.set(true);
      this.shop.bySlug(slug).subscribe({
        next: (data) => {
          this.data.set(data);
          this.activeIndex.set(0);
          this.selectedVariants.set({});
          this.seo.set({
            title: data.product.name,
            description: data.product.summary ?? data.product.name,
          });
          this.loading.set(false);
        },
        error: () => {
          this.data.set(null);
          this.loading.set(false);
        },
      });

      this.shop.reviews(slug, 1, 20).subscribe({
        next: (result) => this.reviews.set(result.items ?? []),
        error: () => this.reviews.set([]),
      });
    });
  }

  protected selectedVariant(groupName: string): string {
    return this.selectedVariants()[groupName]?.value ?? '';
  }

  protected selectVariant(groupName: string, variant: ProductVariant): void {
    this.selectedVariants.update((current) => ({ ...current, [groupName]: variant }));
  }

  protected histogramPercent(star: number): number {
    const counts = this.histogram();
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    if (!total) return 0;
    return ((counts[star] ?? 0) / total) * 100;
  }

  protected addToCart(): void {
    const item = this.product();
    if (!item) return;

    if (!this.auth.isLoggedIn()) {
      this.cart.saveLocal(item._id, 1, this.firstVariant());
      this.toast.info('برای نهایی کردن خرید وارد حساب خود شوید');
      return;
    }

    this.cart.add(item._id, 1, this.firstVariant()).subscribe({
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  private firstVariant(): { name: string; value: string } | null {
    const selected = Object.values(this.selectedVariants());
    return selected.length > 0 ? { name: selected[0].name, value: selected[0].value } : null;
  }

  protected toggleWishlist(): void {
    const item = this.product();
    if (!item) return;
    this.toggleWishlistById(item._id);
  }

  protected toggleWishlistById(productId: string): void {
    if (!this.auth.isLoggedIn()) {
      this.toast.warning('برای افزودن به علاقهمندیها وارد حساب خود شوید');
      return;
    }
    this.cart.toggleWishlist(productId).subscribe({
      next: (result) =>
        this.toast.success(result.wishlisted ? 'به علاقهمندیها اضافه شد' : 'از علاقهمندیها حذف شد'),
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  protected toggleCompare(): void {
    const item = this.product();
    if (item) this.cart.toggleCompare(item._id);
  }

  protected submitReview(): void {
    const item = this.product();
    if (!item) return;
    if (!this.reviewForm.comment.trim() || this.reviewForm.comment.trim().length < 5) {
      this.toast.warning('متن نظر باید حداقل ۵ کاراکتر باشد');
      return;
    }

    this.submitting.set(true);
    this.shop
      .createReview(item.slug, {
        rating: this.reviewForm.rating,
        title: this.reviewForm.title || undefined,
        comment: this.reviewForm.comment.trim(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success('نظر شما ثبت شد و پس از تأیید نمایش داده میشود');
          this.reviewForm = { rating: 5, title: '', comment: '' };
          this.data.update((data) => (data ? { ...data, canReview: false } : data));
        },
        error: (error: Error) => {
          this.submitting.set(false);
          this.toast.error(error.message);
        },
      });
  }

  protected markHelpful(review: ProductReview): void {
    this.shop.markReviewHelpful(review._id).subscribe({
      next: (result) => {
        this.reviews.update((list) =>
          list.map((item) =>
            item._id === review._id ? { ...item, helpfulCount: result.helpfulCount } : item,
          ),
        );
      },
      error: () => undefined,
    });
  }
}
