import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { ArticleCardComponent } from '../../../../shared/components/article-card/article-card';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ArticleService } from '../../../../core/services/article.service';
import { SeoService } from '../../../../core/services/seo.service';
import type { ArticleCard } from '../../../../core/models/article.model';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-search-page',
  imports: [
    IconComponent,
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
        <h1>جستجو در آرشیو</h1>
        <form class="search-form" (submit)="search($event)">
          <div class="input-search grow">
            <app-icon name="search" [size]="18" />
            <input
                          class="input"
                          type="search"
                          name="q"
                          placeholder="واژه موردنظر را وارد کنید…"
                          [value]="query()"
                          (input)="query.set($any($event.target).value)"
              autocomplete="off"
            />
          </div>
          <button type="submit" class="btn btn-primary">
            <app-icon name="search" [size]="16" />
            جستجو
          </button>
        </form>
      </div>
    </div>

    <div class="container page">
      @if (loading()) {
        <app-spinner label="در حال جستجو…" />
      } @else if (!query()) {
        <app-empty-state
          icon="search"
          title="واژه‌ای برای جستجو وارد کنید"
          description="می‌توانید عنوان خبر، نام نویسنده یا بخشی از متن را جستجو کنید."
        />
      } @else if (articles().length) {
        <p class="text-sm text-muted result-count">
          {{ total() | faNumber }} نتیجه برای «{{ query() }}»
        </p>

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
          icon="search"
          title="نتیجه‌ای یافت نشد"
          description="واژه دیگری را امتحان کنید یا فهرست دسته‌بندی‌ها را ببینید."
        />
      }
    </div>
  `,
  styles: `
    .search-form {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-top: var(--space-4);
      max-width: 640px;
    }

    .result-count {
      margin-bottom: var(--space-4);
    }
  `,
})
export class SearchPage {
  /** Bound from the `?q=` query parameter via `withComponentInputBinding`. */
  readonly q = input('');

  private readonly articleService = inject(ArticleService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  protected readonly query = signal('');
  protected readonly articles = signal<ArticleCard[]>([]);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(1);

  constructor() {
    this.seo.set({ title: 'جستجو' });

    effect(() => {
      const term = this.q();
      this.query.set(term);
      this.page.set(1);
      if (term) this.load(term, 1);
      else this.articles.set([]);
    });
  }

  protected search(event: Event): void {
    event.preventDefault();
    const term = this.query().trim();
    if (!term) return;
    void this.router.navigate([], { queryParams: { q: term }, queryParamsHandling: '' });
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load(this.query(), page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private load(term: string, page: number): void {
    this.loading.set(true);
    this.articleService.list({ q: term, page, limit: 12 }).subscribe({
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