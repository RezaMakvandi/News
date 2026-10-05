import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ArticleCardComponent } from '../../../../shared/components/article-card/article-card';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ArticleService } from '../../../../core/services/article.service';
import { SeoService } from '../../../../core/services/seo.service';
import type { ArticleCard } from '../../../../core/models/article.model';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-tag-page',
  imports: [
    RouterLink,
    ArticleCardComponent,
    PaginationComponent,
    SpinnerComponent,
    EmptyStateComponent,
    FaNumberPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-banner">
      <div class="container">
        <div class="breadcrumb">
          <a routerLink="/">صفحه اصلی</a>
          <span class="sep">/</span>
          <span>برچسب</span>
        </div>
        <h1># {{ slug() }}</h1>
        <p>{{ total() | faNumber }} مطلب با این برچسب منتشر شده است.</p>
      </div>
    </div>

    <div class="container page">
      @if (loading()) {
        <app-spinner label="در حال بارگذاری…" />
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
          icon="tag"
          title="مطلبی با این برچسب یافت نشد"
          description="برچسب دیگری را امتحان کنید."
          actionLabel="بازگشت به صفحه اصلی"
          actionIcon="arrow-right"
          (action)="goHome()"
        />
      }
    </div>
  `,
  styles: `
    .breadcrumb {
      margin-bottom: var(--space-3);
    }
  `,
})
export class TagPage {
  /** Bound from the `tag/:slug` route parameter. */
  readonly slug = input('');

  private readonly articleService = inject(ArticleService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  protected readonly articles = signal<ArticleCard[]>([]);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(1);

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (!slug) return;

      this.page.set(1);
      this.seo.set({ title: `برچسب ${slug}` });
      this.load(slug, 1);
    });
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load(this.slug(), page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected goHome(): void {
    void this.router.navigateByUrl('/');
  }

  private load(slug: string, page: number): void {
    this.loading.set(true);
    this.articleService.list({ tag: slug, page, limit: 12 }).subscribe({
      next: (result) => {
        this.articles.set(result.items ?? []);
        this.total.set(result.meta?.total ?? 0);
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