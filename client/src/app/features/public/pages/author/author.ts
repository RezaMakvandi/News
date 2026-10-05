import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { ArticleCardComponent } from '../../../../shared/components/article-card/article-card';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ArticleService } from '../../../../core/services/article.service';
import { SeoService } from '../../../../core/services/seo.service';
import type { ArticleCard } from '../../../../core/models/article.model';
import type { AuthorProfile } from '../../../../core/models/user.model';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-author-page',
  imports: [
      RouterLink,
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
        <div class="breadcrumb">
                  <a routerLink="/">صفحه اصلی</a>
          <span class="sep">/</span>
          <span>نویسندگان</span>
        </div>

        <div class="author-profile">
          <div class="author-avatar">
            @if (author()?.avatar) {
              <img [src]="author()!.avatar" [alt]="author()!.name" />
            } @else {
              <span class="avatar-fallback">{{ initial() }}</span>
            }
          </div>
          <div class="author-info">
            <h1>{{ author()?.name || 'نویسنده' }}</h1>
            @if (author()?.bio) {
              <p class="text-sm text-muted">{{ author()!.bio }}</p>
            }
            <div class="stat-list">
              <span class="stat">
                <app-icon name="file" [size]="15" />
                {{ articleCount() | faNumber }} مطلب منتشر شده
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="container page">
      @if (loading()) {
        <app-spinner label="در حال بارگذاری مطالب…" />
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
          icon="user"
          title="مطلبی از این نویسنده منتشر نشده است"
          description="به‌زودی مطالب تازه‌ای از این نویسنده منتشر خواهد شد."
          actionLabel="بازگشت به صفحه اصلی"
          actionIcon="arrow-right"
          (action)="goHome()"
        />
      }
    </div>
  `,
  styles: `
    .breadcrumb {
      margin-bottom: var(--space-4);
    }

    .author-profile {
      display: flex;
      align-items: center;
      gap: var(--space-5);
    }

    .author-avatar {
      width: 96px;
      height: 96px;
      flex: none;
      border-radius: var(--radius-full);
      overflow: hidden;
      background: var(--accent-soft);
      color: var(--accent);
      display: grid;
      place-items: center;
      font-size: 2rem;
      font-weight: 700;
      border: 3px solid var(--surface);
      box-shadow: var(--shadow-sm);
    }

    .author-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .author-info h1 {
      margin-bottom: var(--space-2);
    }

    .author-info .stat-list {
      margin-top: var(--space-2);
    }

    @media (max-width: 640px) {
      .author-profile {
        flex-direction: column;
        text-align: center;
      }
    }
  `,
})
export class AuthorPage {
  /** Bound from the `author/:slug` route parameter. */
  readonly slug = input('');

  private readonly articleService = inject(ArticleService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  protected readonly author = signal<AuthorProfile | null>(null);
  protected readonly articles = signal<ArticleCard[]>([]);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly articleCount = signal(0);
  protected readonly initial = signal('؟');

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (!slug) return;

      this.page.set(1);
      this.author.set(null);
      this.loadProfile(slug);
      this.loadArticles(slug, 1);
    });
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.loadArticles(this.slug(), page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected goHome(): void {
    void this.router.navigateByUrl('/');
  }

  private loadProfile(slug: string): void {
    this.articleService.author(slug).subscribe({
      next: (author) => {
        this.author.set(author);
        this.articleCount.set(author.articlesCount ?? 0);
        this.initial.set((author.name || '؟').trim().charAt(0));
        this.seo.set({ title: `مطالب ${author.name}` });
      },
      error: () => this.author.set(null),
    });
  }

  private loadArticles(slug: string, page: number): void {
    this.loading.set(true);
    this.articleService.list({ author: slug, page, limit: 12 }).subscribe({
      next: (result) => {
        this.articles.set(result.items ?? []);
        this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
        if (!this.author()) this.articleCount.set(result.meta?.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.articles.set([]);
        this.loading.set(false);
      },
    });
  }
}