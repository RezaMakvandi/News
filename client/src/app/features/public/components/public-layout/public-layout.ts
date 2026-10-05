import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SiteHeaderComponent } from '../../../../shared/components/site-header/site-header';
import { SiteFooterComponent } from '../../../../shared/components/site-footer/site-footer';
import { BreakingTickerComponent } from '../../../../shared/components/breaking-ticker/breaking-ticker';
import { CategoryService } from '../../../../core/services/taxonomy.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { ArticleService } from '../../../../core/services/article.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ThemeService } from '../../../../core/services/theme.service';
import type { Category } from '../../../../core/models/taxonomy.model';
import type { ArticleCard } from '../../../../core/models/article.model';
import type { Page } from '../../../../core/models/settings.model';

/** Public shell: header, breaking ticker, routed content, footer. */
@Component({
  selector: 'app-public-layout',
  imports: [
    RouterOutlet,
    IconComponent,
    SiteHeaderComponent,
    SiteFooterComponent,
    BreakingTickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main-content">پرش به محتوای اصلی</a>

    <app-site-header [categories]="categories()" />
    @if (breakingEnabled()) {
      <app-breaking-ticker [items]="breaking()" />
    }

    <main id="main-content">
      <router-outlet />
    </main>

    <app-site-footer [categories]="categories()" [pages]="pages()" />

    <button
      type="button"
      class="to-top"
      [class.is-visible]="showTop()"
      (click)="scrollTop()"
      aria-label="بازگشت به بالای صفحه"
      title="بازگشت به بالا"
    >
      <app-icon name="chevron-down" [size]="18" />
    </button>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    main {
      flex: 1;
    }

    .skip-link {
      position: absolute;
      inset-inline-start: -9999px;
      top: 0;
      z-index: 400;
      padding: 10px 16px;
      background: var(--accent);
      color: var(--accent-contrast);
      border-radius: 0 0 var(--radius-sm) 0;

      &:focus {
        inset-inline-start: 0;
      }
    }

    .to-top {
      position: fixed;
      inset-block-end: var(--space-5);
      inset-inline-end: var(--space-5);
      z-index: var(--z-header);
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border: 1px solid var(--border);
      border-radius: var(--radius-full);
      background: var(--surface);
      color: var(--text-muted);
      box-shadow: var(--shadow);
      opacity: 0;
      visibility: hidden;
      transform: translateY(10px);
      transition: opacity var(--transition), transform var(--transition), visibility var(--transition),
        color var(--transition-fast);

      &.is-visible {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      &:hover {
        color: var(--accent);
        border-color: var(--accent);
      }

      app-icon {
        transform: rotate(180deg);
      }
    }
  `,
  host: {
    '(window:scroll)': 'onScroll()',
  },
})
export class PublicLayoutComponent {
  private readonly categoryService = inject(CategoryService);
  private readonly settingsService = inject(SettingsService);
  private readonly articleService = inject(ArticleService);
  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);

  protected readonly categories = signal<Category[]>([]);
  protected readonly pages = signal<Page[]>([]);
  protected readonly breaking = signal<ArticleCard[]>([]);
  protected readonly showTop = signal(false);

  protected readonly breakingEnabled = computed(
    () => this.settingsService.settings()['breakingEnabled'] !== false,
  );

  constructor() {
    this.categoryService.list().subscribe({
      next: (categories) => this.categories.set(categories ?? []),
      error: () => this.categories.set([]),
    });

    this.settingsService.pages().subscribe({
      next: (pages) => this.pages.set((pages ?? []).filter((page) => page.isPublished !== false)),
      error: () => this.pages.set([]),
    });

    this.articleService.headlines().subscribe({
      next: (headlines) => this.breaking.set(headlines?.breaking ?? []),
      error: () => this.breaking.set([]),
    });

    // Apply the configured default theme and accent once settings arrive.
    this.settingsService.load().subscribe({
      error: () => undefined,
    });

    effect(() => {
      const defaultTheme = this.settingsService.settings()['themeDefault'];
      if (defaultTheme === 'light' || defaultTheme === 'dark') {
        try {
          if (!localStorage.getItem('zoomit-theme')) this.theme.set(defaultTheme);
        } catch {
          /* storage unavailable */
        }
      }
    });

    if (this.auth.isLoggedIn()) {
      this.auth.refresh().subscribe({ error: () => this.auth.logout(false) });
    }
  }

  protected onScroll(): void {
    this.showTop.set(window.scrollY > 600);
  }

  protected scrollTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}