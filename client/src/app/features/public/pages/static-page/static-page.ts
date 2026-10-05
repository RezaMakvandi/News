import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { SafeHtmlPipe } from '../../../../shared/pipes/safe-html.pipe';
import { SettingsService } from '../../../../core/services/settings.service';
import { SeoService } from '../../../../core/services/seo.service';
import type { Page } from '../../../../core/models/settings.model';
import { FaDatePipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-static-page',
  imports: [RouterLink, SpinnerComponent, EmptyStateComponent, SafeHtmlPipe, FaDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      @if (loading()) {
        <app-spinner label="در حال بارگذاری…" />
      } @else if (page()) {
        <article class="static-article">
          <header class="static-head">
            <div class="breadcrumb">
              <a routerLink="/">صفحه اصلی</a>
              <span class="sep">/</span>
              <span>{{ page()!.title }}</span>
            </div>
            <h1>{{ page()!.title }}</h1>
            @if (page()!.updatedAt) {
              <p class="text-xs text-faint">آخرین به‌روزرسانی: {{ page()!.updatedAt | faDate }}</p>
            }
          </header>

          <div class="static-body" [innerHTML]="page()!.content | safeHtml"></div>
        </article>
      } @else {
        <app-empty-state
          icon="file"
          title="صفحه یافت نشد"
          description="این صفحه حذف شده یا آدرس آن تغییر کرده است."
          actionLabel="بازگشت به صفحه اصلی"
          actionIcon="arrow-right"
          (action)="goHome()"
        />
      }
    </div>
  `,
  styles: `
    .static-article {
      max-width: 820px;
      margin-inline: auto;
    }

    .static-head {
      margin-bottom: var(--space-6);
      text-align: center;
    }

    .static-head .breadcrumb {
      justify-content: center;
      margin-bottom: var(--space-4);
    }

    .static-head h1 {
      margin-bottom: var(--space-2);
    }

    .static-body {
      line-height: 2;
      color: var(--text);
      font-size: 1.0625rem;
    }

    .static-body :is(p, ul, ol, blockquote, table, figure) {
      margin-bottom: var(--space-4);
    }

    .static-body h2,
    .static-body h3 {
      margin: var(--space-6) 0 var(--space-3);
      color: var(--text-strong);
    }

    .static-body a {
      color: var(--accent);
      text-decoration: underline;
    }

    .static-body img {
      max-width: 100%;
      border-radius: var(--radius);
    }
  `,
})
export class StaticPage {
  /** Bound from the `page/:slug` route parameter. */
  readonly slug = input('');

  private readonly settingsService = inject(SettingsService);
  private readonly seo = inject(SeoService);

  protected readonly page = signal<Page | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (!slug) return;
      this.load(slug);
    });
  }

  protected goHome(): void {
    window.history.back();
  }

  private load(slug: string): void {
    this.loading.set(true);
    this.page.set(null);

    this.settingsService.page(slug).subscribe({
      next: (page) => {
        this.page.set(page);
        this.loading.set(false);
        this.seo.set({
          title: page.seo?.title || page.title,
          description: page.seo?.description || page.excerpt,
        });
      },
      error: () => {
        this.page.set(null);
        this.loading.set(false);
      },
    });
  }
}