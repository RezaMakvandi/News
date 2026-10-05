import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleCardComponent } from '../../../../shared/components/article-card/article-card';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ArticleService } from '../../../../core/services/article.service';
import { CategoryService } from '../../../../core/services/taxonomy.service';
import { SeoService } from '../../../../core/services/seo.service';
import type { ArticleCard } from '../../../../core/models/article.model';
import type { Category } from '../../../../core/models/taxonomy.model';

@Component({
  selector: 'app-category-page',
  imports: [
    RouterLink,
    ArticleCardComponent,
    PaginationComponent,
    SpinnerComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-banner">
      <div class="container">
        <div class="breadcrumb">
          <a routerLink="/">صفحه اصلی</a>
          <span class="sep">/</span>
          <span>{{ category()?.name ?? 'دسته‌بندی' }}</span>
        </div>
        <h1>{{ category()?.name ?? 'دسته‌بندی' }}</h1>
        <p>{{ subtitle() }}</p>
      </div>
    </div>

    <div class="container page">
      @if (loading()) {
        <app-spinner label="در حال بارگذاری اخبار دسته…" />
      } @else if (articles().length) {
        <div class="article-grid">
          @for (item of articles(); track item._id) {
            <app-article-card [article]="item" />
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
          icon="folder"
          title="مطلبی در این دسته یافت نشد"
          description="به‌زودی اخبار این دسته‌بندی منتشر می‌شود."
          actionLabel="بازگشت به صفحه اصلی"
          actionIcon="arrow-right"
          (action)="goHome()"
        />
      }
    </div>
  `,
  styles: `
    .page-banner .breadcrumb {
      margin-bottom: var(--space-3);
    }
  `,
})
export class CategoryPage {
  /** Bound from the `category/:slug` route parameter. */
  readonly slug = input('');

  private readonly articleService = inject(ArticleService);
  private readonly categoryService = inject(CategoryService);
  private readonly seo = inject(SeoService);

  protected readonly category = signal<Category | null>(null);
  protected readonly articles = signal<ArticleCard[]>([]);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (!slug) return;

      this.loading.set(true);
      this.page.set(1);

      this.categoryService.bySlug(slug).subscribe({
        next: (category) => {
          this.category.set(category);
          this.seo.set({
            title: category.name,
            description: category.description ?? `آخرین اخبار و مطالب دسته ${category.name}`,
          });
        },
        error: () => this.category.set(null),
      });

      this.loadArticles(slug, 1);
    });
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.loadArticles(this.slug(), page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected goHome(): void {
    window.location.href = '/';
  }

  protected subtitle(): string {
    const category = this.category();
    if (category?.description) return category.description;
    if (category?.articlesCount !== undefined) {
      return `${(category.articlesCount ?? 0).toLocaleString('fa-IR')} مطلب در این دسته‌بندی منتشر شده است.`;
    }
    return 'آخرین اخبار و مطالب این دسته‌بندی';
  }

  private loadArticles(slug: string, page: number): void {
    this.articleService.list({ category: slug, page, limit: 12 }).subscribe({
      next: (result) => {
        this.articles.set(result.items ?? []);
        this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
        this.loading.set(false);
      },
      error: () => {
        this.articles.set([]);
        this.loading.set(false);
      },
    });
  }
}