import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { ArticleCardComponent } from '../../../../shared/components/article-card/article-card';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ArticleService } from '../../../../core/services/article.service';
import { TagService } from '../../../../core/services/taxonomy.service';
import { SeoService } from '../../../../core/services/seo.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { asAuthor, asCategory, categoryColor } from '../../../../core/utils/relation';
import type { ArticleCard, HeadlinesResponse } from '../../../../core/models/article.model';
import type { Tag } from '../../../../core/models/taxonomy.model';
import { FaDatePipe, FaNumberPipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-home-page',
  imports: [
    RouterLink,
    IconComponent,
    ArticleCardComponent,
    SpinnerComponent,
    EmptyStateComponent,
    FaDatePipe,
    FaNumberPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      @if (loading()) {
        <app-spinner label="در حال دریافت آخرین اخبار…" />
      } @else {
        @if (hero(); as main) {
          <section class="hero-grid animate-in">
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
                    <img [src]="item.cover" [alt]="item.coverAlt || item.title" loading="lazy" />
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
          </section>
        }

        <div class="layout-with-sidebar">
          <div>
            @if (featured().length) {
              <section class="section-head">
                <h2 class="section-title">گزارش‌های ویژه</h2>
                <a class="text-sm text-accent" routerLink="/search">مشاهده همه</a>
              </section>
              <div class="article-grid">
                @for (item of featured(); track item._id) {
                  <app-article-card [article]="item" />
                }
              </div>
            }

            <section class="section-head latest-head">
              <h2 class="section-title">تازه‌ترین اخبار</h2>
            </section>

            @if (latest().length) {
              <div class="article-grid">
                @for (item of latest(); track item._id) {
                  <app-article-card [article]="item" />
                }
              </div>
              <div class="row" style="justify-content: center; margin-top: var(--space-6)">
                <a class="btn btn-outline" routerLink="/search">
                  <app-icon name="list" [size]="16" />
                  آرشیو کامل اخبار
                </a>
              </div>
            } @else {
              <app-empty-state
                icon="file"
                title="هنوز خبری منتشر نشده است"
                description="به‌زودی مطالب تازه در این بخش نمایش داده می‌شود."
              />
            }
          </div>

          <aside>
            @if (popular().length) {
              <section class="widget">
                <h3 class="widget-head">
                  <app-icon name="star" [size]="16" />
                  پربازدیدترین‌ها
                </h3>
                <div class="widget-body">
                  @for (item of popular(); track item._id; let i = $index) {
                    <a class="article-row" [routerLink]="['/news', item.slug]">
                      <span class="row-index">{{ i + 1 | faNumber }}</span>
                      <span class="row-title clamp-2">{{ item.title }}</span>
                    </a>
                  }
                </div>
              </section>
            }

            @if (tags().length) {
              <section class="widget">
                <h3 class="widget-head">
                  <app-icon name="tag" [size]="16" />
                  برچسب‌های داغ
                </h3>
                <div class="widget-body">
                  <div class="tag-cloud">
                    @for (tag of tags(); track tag._id) {
                      <a class="chip" [routerLink]="['/tag', tag.slug]">
                        {{ tag.name }}
                        <span class="text-xs text-faint">{{ tag.usageCount | faNumber }}</span>
                      </a>
                    }
                  </div>
                </div>
              </section>
            }

            <section class="widget">
              <h3 class="widget-head">
                <app-icon name="mail" [size]="16" />
                خبرنامه
              </h3>
              <div class="widget-body">
                <p class="text-sm text-muted">
                  مهم‌ترین خبرهای فناوری روز را در ایمیل خود دریافت کنید.
                </p>
                <a class="btn btn-primary btn-block" routerLink="/contact">
                  <app-icon name="send" [size]="16" />
                  عضویت در خبرنامه
                </a>
              </div>
            </section>
          </aside>
        </div>
      }
    </div>
  `,
  styles: `
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

    .latest-head {
      margin-top: var(--space-6);
    }

    .badge {
      align-self: flex-start;
      color: #fff;
    }

    .row-index {
      flex-shrink: 0;
      margin-inline-end: var(--space-2);
    }

    .article-row {
      grid-template-columns: 28px minmax(0, 1fr);
    }

    .widget-body .btn-block {
      margin-top: var(--space-3);
    }

    aside .widget:last-child {
      margin-bottom: 0;
    }
  `,
})
export class HomePage {
  private readonly articleService = inject(ArticleService);
  private readonly tagService = inject(TagService);
  private readonly seo = inject(SeoService);
  private readonly settings = inject(SettingsService);

  protected readonly loading = signal(true);
  protected readonly headlines = signal<HeadlinesResponse | null>(null);
  protected readonly popular = signal<ArticleCard[]>([]);
  protected readonly tags = signal<Tag[]>([]);

  protected readonly hero = computed(() => {
    const data = this.headlines();
    if (!data) return null;
    return data.hero ?? data.featured[0] ?? data.latest[0] ?? null;
  });

  protected readonly featured = computed(() => this.headlines()?.featured ?? []);

  protected readonly latest = computed(() => this.headlines()?.latest ?? []);

  /** Side column shows featured items, padded with the latest ones. */
  protected readonly sideCards = computed(() => {
    const data = this.headlines();
    if (!data) return [];
    const heroId = this.hero()?._id;
    const pool = [...data.featured, ...data.latest].filter((item) => item._id !== heroId);
    return pool.slice(0, 3);
  });

  constructor() {
    this.seo.set({
      title: this.siteTitle(),
      description: (this.settings.settings()['siteDescription'] as string) || undefined,
      keywords: (this.settings.settings()['seoKeywords'] as string[]) ?? undefined,
    });

    this.articleService.headlines().subscribe({
      next: (data) => {
        this.headlines.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.articleService.popular(6).subscribe({
      next: (items) => this.popular.set(items ?? []),
      error: () => this.popular.set([]),
    });

    this.tagService.popular(14).subscribe({
      next: (items) => this.tags.set(items ?? []),
      error: () => this.tags.set([]),
    });
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

  private siteTitle(): string {
    return (
      (this.settings.settings()['seoTitle'] as string) ||
      `${this.settings.settings()['siteName'] ?? 'زوم‌آیتی'} | رسانه فناوری`
    );
  }
}