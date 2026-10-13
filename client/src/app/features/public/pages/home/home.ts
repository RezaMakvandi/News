import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { ArticleCardComponent } from '../../../../shared/components/article-card/article-card';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { ArticleService } from '../../../../core/services/article.service';
import { CategoryService, TagService } from '../../../../core/services/taxonomy.service';
import { ShopService } from '../../../../core/services/shop.service';
import { CartService } from '../../../../core/services/cart.service';
import { SeoService } from '../../../../core/services/seo.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { asAuthor, asCategory, categoryColor } from '../../../../core/utils/relation';
import type { ArticleCard, HeadlinesResponse } from '../../../../core/models/article.model';
import type { ProductCard, ProductCategory } from '../../../../core/models/product.model';
import type { Category, Tag } from '../../../../core/models/taxonomy.model';
import type { HomeSection } from '../../../../core/models/home-layout.model';
import { layoutRows, sectionWidth } from '../../../../core/models/home-layout.model';
import { FaDatePipe, FaNumberPipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-home-page',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    IconComponent,
    ArticleCardComponent,
    ProductCardComponent,
    SpinnerComponent,
    FaDatePipe,
    FaNumberPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      @if (loading()) {
        <app-spinner label="در حال دریافت آخرین اخبار…" />
      } @else {
        @for (row of rows(); track $index) {
          <div class="home-row">
            @for (section of row; track section.id) {
              <section class="home-block" [style.--w]="width(section)">
                @switch (section.type) {
                  @case ('hero') {
                    @if (hero(); as main) {
                      <div class="hero-grid animate-in">
                        <a class="hero-main" [routerLink]="['/news', main.slug]">
                          @if (main.cover) {
                            <img [src]="main.cover" [alt]="main.coverAlt || main.title" />
                          }
                          <span class="hero-overlay">
                            @if (mainCategory(main); as category) {
                              <span class="badge badge-accent" [style.background]="mainColor(main)">
                                {{ category.name }}
                              </span>
                            }
                            <h1 class="hero-title">{{ main.title }}</h1>
                            @if (main.summary) {
                              <p class="hero-summary clamp-2">{{ main.summary }}</p>
                            }
                            <span class="hero-meta">
                              <span class="meta-item">
                                <app-icon name="user" [size]="14" />
                                {{ mainAuthor(main) }}
                              </span>
                              <span class="meta-item">
                                <app-icon name="clock" [size]="14" />
                                {{ main.publishedAt | faDate: 'relative' }}
                              </span>
                              <span class="meta-item">
                                <app-icon name="eye" [size]="14" />
                                {{ main.views | faNumber }} بازدید
                              </span>
                            </span>
                          </span>
                        </a>

                        <div class="hero-side">
                          @for (item of sideCards(); track item._id) {
                            <a class="hero-side-card" [routerLink]="['/news', item.slug]">
                              @if (item.cover) {
                                <img
                                  [src]="item.cover"
                                  [alt]="item.coverAlt || item.title"
                                  loading="lazy"
                                />
                              }
                              <span class="hs-body">
                                <span class="hs-title clamp-2">{{ item.title }}</span>
                                <span class="text-xs text-faint">
                                  {{ item.publishedAt | faDate: 'relative' }}
                                </span>
                              </span>
                            </a>
                          }
                        </div>
                      </div>
                    }
                  }

                  @case ('breaking_articles') {
                    @if (articlesFor(section).length) {
                      <div class="widget">
                        <h3 class="widget-head">
                          <app-icon name="bell" [size]="16" />
                          {{ blockTitle(section) }}
                        </h3>
                        <div class="widget-body">
                          @for (item of articlesFor(section); track item._id) {
                            <a class="breaking-row" [routerLink]="['/news', item.slug]">
                              <span class="row-title clamp-2">{{ item.title }}</span>
                              <span class="text-xs text-faint">
                                {{ item.publishedAt | faDate: 'relative' }}
                              </span>
                            </a>
                          }
                        </div>
                      </div>
                    }
                  }

                  @case ('tags_cloud') {
                    @if (tagsFor(section).length) {
                      <div class="widget">
                        <h3 class="widget-head">
                          <app-icon name="tag" [size]="16" />
                          {{ blockTitle(section) }}
                        </h3>
                        <div class="widget-body">
                          <div class="tag-cloud">
                            @for (tag of tagsFor(section); track tag._id) {
                              <a class="chip" [routerLink]="['/tag', tag.slug]">
                                {{ tag.name }}
                                <span class="text-xs text-faint">
                                  {{ tag.usageCount | faNumber }}
                                </span>
                              </a>
                            }
                          </div>
                        </div>
                      </div>
                    }
                  }

                  @case ('products') {
                    @if (productsFor(section).length) {
                      <ng-container
                        [ngTemplateOutlet]="blockHead"
                        [ngTemplateOutletContext]="{ $implicit: section }"
                      />
                      <div class="home-grid" [style.--cols]="section.columns ?? 4">
                        @for (item of productsFor(section); track item._id) {
                          <app-product-card
                            [product]="item"
                            (wishlistToggled)="toggleWishlist($event)"
                          />
                        }
                      </div>
                    }
                  }

                  @case ('product_categories') {
                    @if (visibleProductCategories(section).length) {
                      <ng-container
                        [ngTemplateOutlet]="blockHead"
                        [ngTemplateOutletContext]="{ $implicit: section }"
                      />
                      <div class="category-tiles">
                        @for (category of visibleProductCategories(section); track category._id) {
                          <a
                            class="category-tile"
                            [routerLink]="['/shop/products']"
                            [queryParams]="{ category: category.slug }"
                          >
                            <span class="tile-icon">
                              <app-icon [name]="category.icon || 'package'" [size]="24" />
                            </span>
                            <span class="tile-name">{{ category.name }}</span>
                            <span class="tile-count">
                              {{ category.productsCount || 0 | faNumber }} کالا
                            </span>
                          </a>
                        }
                      </div>
                    }
                  }

                  @case ('shop_banner') {
                    <div class="shop-banner">
                      <div class="shop-banner-text">
                        @if (blockTitle(section)) {
                          <h2>{{ blockTitle(section) }}</h2>
                        }
                        @if (section.subtitle) {
                          <p>{{ section.subtitle }}</p>
                        }
                      </div>
                      <a class="btn btn-lg banner-cta" [routerLink]="section.ctaHref || '/shop'">
                        <app-icon name="store" [size]="18" />
                        {{ section.ctaLabel || 'ورود به فروشگاه' }}
                      </a>
                    </div>
                  }

                  @case ('newsletter') {
                    <div class="widget newsletter-block">
                      <h3 class="widget-head">
                        <app-icon name="mail" [size]="16" />
                        {{ blockTitle(section) }}
                      </h3>
                      <div class="widget-body">
                        @if (section.subtitle) {
                          <p class="text-sm text-muted">{{ section.subtitle }}</p>
                        }
                        <a
                          class="btn btn-primary btn-block"
                          [routerLink]="section.ctaHref || '/contact'"
                        >
                          <app-icon name="send" [size]="16" />
                          {{ section.ctaLabel || 'عضویت در خبرنامه' }}
                        </a>
                      </div>
                    </div>
                  }

                  @case ('html') {
                    @if (section.html) {
                      <div class="html-block" [innerHTML]="section.html"></div>
                    }
                  }

                  @default {
                    @if (articlesFor(section).length) {
                      <ng-container
                        [ngTemplateOutlet]="blockHead"
                        [ngTemplateOutletContext]="{ $implicit: section }"
                      />
                      <div class="home-grid" [style.--cols]="section.columns ?? 4">
                        @for (item of articlesFor(section); track item._id) {
                          <app-article-card [article]="item" />
                        }
                      </div>
                    }
                  }
                }
              </section>
            }
          </div>
        }
      }
    </div>

    <ng-template #blockHead let-section>
      <div class="section-head">
        <h2 class="section-title">{{ blockTitle(section) }}</h2>
        @if (section.showCta && section.ctaHref) {
          <a class="text-sm text-accent" [routerLink]="section.ctaHref">
            {{ section.ctaLabel || 'مشاهده همه' }}
          </a>
        }
      </div>
    </ng-template>
  `,
  styles: `
    .home-row {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: var(--space-6);
      margin-bottom: var(--space-6);
    }

    .home-row:last-child {
      margin-bottom: 0;
    }

    /* Full width by default; side-by-side only on wider viewports. */
    .home-block {
      grid-column: span 12 / span 12;
      min-width: 0;
    }

    @media (min-width: 901px) {
      .home-block {
        grid-column: span var(--w, 12) / span var(--w, 12);
      }
    }

    @media (max-width: 900px) {
      .home-row {
        gap: var(--space-5);
      }
    }

    .home-grid {
      display: grid;
      grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr));
      gap: var(--space-5);
    }

    @media (max-width: 1100px) {
      .home-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 820px) {
      .home-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 520px) {
      .home-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    .hero-side-card {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-2);
    }

    .hs-body {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      min-width: 0;
    }

    .badge {
      align-self: flex-start;
      color: #fff;
    }

    .breaking-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--border);
    }

    .breaking-row:last-child {
      border-bottom: 0;
    }

    .widget-body .btn-block {
      margin-top: var(--space-3);
    }

    .shop-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      flex-wrap: wrap;
      padding: var(--space-6);
      border-radius: var(--radius-lg);
      background: linear-gradient(
        135deg,
        var(--accent),
        color-mix(in srgb, var(--accent) 60%, #7c3aed)
      );
      color: #fff;
      box-shadow: var(--shadow);
    }

    .shop-banner-text h2 {
      margin: 0 0 var(--space-2);
      color: #fff;
      font-size: 1.4rem;
      font-weight: 800;
    }

    .shop-banner-text p {
      margin: 0;
      max-width: 60ch;
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.92rem;
    }

    .banner-cta {
      background: #fff;
      color: var(--accent);
    }

    .banner-cta:hover:not(:disabled) {
      background: #fff;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.2);
    }

    .html-block {
      line-height: 1.9;
    }
  `,
})
export class HomePage {
  private readonly articleService = inject(ArticleService);
  private readonly categoryService = inject(CategoryService);
  private readonly tagService = inject(TagService);
  private readonly shop = inject(ShopService);
  private readonly cart = inject(CartService);
  private readonly seo = inject(SeoService);
  private readonly settings = inject(SettingsService);
  private readonly toast = inject(ToastService);

  protected readonly layout = this.settings.homeLayout;

  /** Enabled sections grouped into side-by-side rows (12-column grid). */
  protected readonly rows = computed(() =>
    layoutRows(this.layout().filter((section) => section.enabled !== false)),
  );

  protected readonly loading = signal(true);
  protected readonly ready = signal(false);
  protected readonly headlines = signal<HeadlinesResponse | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly tags = signal<Tag[]>([]);
  protected readonly productCategories = signal<ProductCategory[]>([]);

  /** Article lists keyed by query signature (`popular`, `cat:<slug>`, ...). */
  private readonly articles = signal<Record<string, ArticleCard[]>>({});
  /** Product lists keyed by query signature. */
  private readonly products = signal<Record<string, ProductCard[]>>({});
  private readonly loaded = new Set<string>();

  protected readonly hero = computed(() => {
    const data = this.headlines();
    if (!data) return null;
    return data.hero ?? data.featured[0] ?? data.latest[0] ?? null;
  });

  /** Side column shows featured items, padded with the latest ones. */
  protected readonly sideCards = computed(() => {
    const data = this.headlines();
    if (!data) return [];
    const heroId = this.hero()?._id;
    const pool = [...data.featured, ...data.latest].filter((item) => item._id !== heroId);
    return pool.slice(0, 3);
  });

  constructor() {
    this.settings.load().subscribe({
      next: () => this.onReady(),
      error: () => this.onReady(),
    });

    // Re-fetch the data required whenever the configured layout changes.
    effect(() => {
      if (this.ready()) this.ensureData(this.layout());
    });
  }

  /* ------------------------------- Template ------------------------------ */

  protected articlesFor(section: HomeSection): ArticleCard[] {
    const limit = this.clampLimit(section.limit, 8);
    const data = this.headlines();
    let items: ArticleCard[] = [];

    switch (section.type) {
      case 'featured_articles':
        items = data?.featured ?? [];
        break;
      case 'latest_articles':
        items = data?.latest ?? [];
        break;
      case 'breaking_articles':
        items = data?.breaking ?? [];
        break;
      case 'popular_articles':
        items = this.articles()['popular'] ?? [];
        break;
      case 'category_articles':
        items = section.categorySlug ? (this.articles()[`cat:${section.categorySlug}`] ?? []) : [];
        break;
      case 'tag_articles':
        items = section.tagSlug ? (this.articles()[`tag:${section.tagSlug}`] ?? []) : [];
        break;
    }
    return items.slice(0, limit);
  }

  protected productsFor(section: HomeSection): ProductCard[] {
    const items = this.products()[this.productKey(section)] ?? [];
    return items.slice(0, this.clampLimit(section.limit, 8));
  }

  protected tagsFor(section: HomeSection): Tag[] {
    return this.tags().slice(0, this.clampLimit(section.limit, 14));
  }

  protected visibleProductCategories(section: HomeSection): ProductCategory[] {
    return this.productCategories().slice(0, this.clampLimit(section.limit, 8));
  }

  /** Resolved 12-column span for a section. */
  protected width(section: HomeSection): number {
    return sectionWidth(section);
  }

  protected blockTitle(section: HomeSection): string {
    if (section.title?.trim()) return section.title.trim();
    switch (section.type) {
      case 'featured_articles':
        return 'گزارش‌های ویژه';
      case 'latest_articles':
        return 'تازه‌ترین اخبار';
      case 'popular_articles':
        return 'پربازدیدترین‌ها';
      case 'breaking_articles':
        return 'خبرهای فوری';
      case 'category_articles':
        return this.categories().find((c) => c.slug === section.categorySlug)?.name ?? 'اخبار دسته';
      case 'tag_articles':
        return section.tagSlug ? `#${section.tagSlug}` : 'اخبار برچسب';
      case 'products':
        return (
          this.productCategories().find((c) => c.slug === section.productCategory)?.name ??
          this.productSortLabel(section.sort)
        );
      case 'product_categories':
        return 'دسته‌بندی محصولات';
      case 'tags_cloud':
        return 'برچسب‌های داغ';
      case 'newsletter':
        return 'خبرنامه';
      default:
        return section.title ?? '';
    }
  }

  protected mainCategory(article: ArticleCard) {
    return asCategory(article.category);
  }

  protected mainColor(article: ArticleCard): string {
    return categoryColor(article.category);
  }

  protected mainAuthor(article: ArticleCard): string {
    return asAuthor(article.author)?.name ?? 'تحریریه';
  }

  protected toggleWishlist(productId: string): void {
    this.cart.toggleWishlist(productId).subscribe({
      next: (result) =>
        this.toast.success(
          result.wishlisted ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد',
        ),
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  /* -------------------------------- Loading ------------------------------ */

  private onReady(): void {
    this.ready.set(true);
    this.seo.set({
      title: this.siteTitle(),
      description: (this.settings.settings()['siteDescription'] as string) || undefined,
      keywords: (this.settings.settings()['seoKeywords'] as string[]) ?? undefined,
    });
    this.loading.set(false);
  }

  /** Fetches the data required by the current layout, skipping loaded queries. */
  private ensureData(layout: HomeSection[]): void {
    const enabled = layout.filter((section) => section.enabled !== false);
    let wantsHeadlines = false;
    let wantsCategories = false;

    const limits = new Map<string, number>();
    const track = (key: string, limit: number) =>
      limits.set(key, Math.max(limits.get(key) ?? 0, limit));

    for (const section of enabled) {
      const limit = this.clampLimit(section.limit, 8);
      switch (section.type) {
        case 'hero':
        case 'featured_articles':
        case 'latest_articles':
        case 'breaking_articles':
          wantsHeadlines = true;
          break;
        case 'popular_articles':
          track('popular', limit);
          break;
        case 'category_articles':
          wantsCategories = true;
          if (section.categorySlug) track(`cat:${section.categorySlug}`, limit);
          break;
        case 'tag_articles':
          if (section.tagSlug) track(`tag:${section.tagSlug}`, limit);
          break;
        case 'tags_cloud':
          track('tags', this.clampLimit(section.limit, 14));
          break;
        case 'product_categories':
          track('productCategories', this.clampLimit(section.limit, 8));
          break;
        case 'products':
          track(this.productKey(section), limit);
          break;
      }
    }

    if (wantsHeadlines && !this.loaded.has('headlines')) {
      this.loaded.add('headlines');
      this.articleService.headlines().subscribe({
        next: (data) => this.headlines.set(data),
        error: () => this.headlines.set(null),
      });
    }

    if (wantsCategories && !this.loaded.has('categories')) {
      this.loaded.add('categories');
      this.categoryService.list().subscribe({
        next: (items) => this.categories.set(items ?? []),
        error: () => this.categories.set([]),
      });
    }

    for (const [key, limit] of limits) {
      if (this.loaded.has(key)) continue;
      this.loaded.add(key);
      this.loadQuery(key, limit);
    }
  }

  private loadQuery(key: string, limit: number): void {
    if (key === 'popular') {
      this.articleService.popular(limit).subscribe({
        next: (items) => this.patchArticles('popular', items ?? []),
        error: () => this.patchArticles('popular', []),
      });
      return;
    }

    if (key === 'tags') {
      this.tagService.popular(limit).subscribe({
        next: (items) => this.tags.set(items ?? []),
        error: () => this.tags.set([]),
      });
      return;
    }

    if (key === 'productCategories') {
      this.shop.categories().subscribe({
        next: (items) => this.productCategories.set(items ?? []),
        error: () => this.productCategories.set([]),
      });
      return;
    }

    if (key.startsWith('cat:')) {
      const slug = key.slice(4);
      this.articleService.list({ category: slug, limit }).subscribe({
        next: (result) => this.patchArticles(key, result.items ?? []),
        error: () => this.patchArticles(key, []),
      });
      return;
    }

    if (key.startsWith('tag:')) {
      const slug = key.slice(4);
      this.articleService.list({ tag: slug, limit }).subscribe({
        next: (result) => this.patchArticles(key, result.items ?? []),
        error: () => this.patchArticles(key, []),
      });
      return;
    }

    if (key.startsWith('prod|')) {
      const [, category, sort, sale, featured] = key.split('|');
      this.shop
        .list({
          category: category === 'all' ? undefined : category,
          sort,
          onSale: sale === 'sale' ? true : undefined,
          featured: featured === 'feat' ? true : undefined,
          limit,
        })
        .subscribe({
          next: (result) => this.patchProducts(key, result.items ?? []),
          error: () => this.patchProducts(key, []),
        });
    }
  }

  private patchArticles(key: string, items: ArticleCard[]): void {
    this.articles.update((map) => ({ ...map, [key]: items }));
  }

  private patchProducts(key: string, items: ProductCard[]): void {
    this.products.update((map) => ({ ...map, [key]: items }));
  }

  /* -------------------------------- Helpers ------------------------------ */

  private productKey(section: HomeSection): string {
    return [
      'prod',
      section.productCategory || 'all',
      section.sort || 'newest',
      section.onSale ? 'sale' : '',
      section.featured ? 'feat' : '',
    ].join('|');
  }

  private productSortLabel(sort?: string): string {
    switch (sort) {
      case 'popular':
        return 'پرفروش‌ترین کالاها';
      case 'price-asc':
        return 'ارزان‌ترین کالاها';
      case 'price-desc':
        return 'گران‌ترین کالاها';
      case 'rating':
        return 'محبوب‌ترین کالاها';
      default:
        return 'جدیدترین کالاها';
    }
  }

  private clampLimit(value: number | undefined, fallback: number): number {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    return Math.min(24, Math.floor(num));
  }

  private siteTitle(): string {
    return (
      (this.settings.settings()['seoTitle'] as string) ||
      `${this.settings.settings()['siteName'] ?? 'زوم‌آیتی'} | رسانه فناوری`
    );
  }
}
