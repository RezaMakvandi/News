import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../icon/icon';
import { ThemeService } from '../../../core/services/theme.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { FaNumberPipe } from '../../pipes/format.pipe';
import type { Category } from '../../../core/models/taxonomy.model';
import { faNumber } from '../../../core/utils/format';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, IconComponent, FaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="site-header" [class.is-scrolled]="scrolled()">
      <div class="container header-inner">
        <a class="brand" routerLink="/" aria-label="صفحه اصلی">
          <span class="brand-mark">{{ siteInitial() }}</span>
          <span class="brand-text">
            <span class="brand-name">{{ siteName() }}</span>
            <span class="brand-tag">{{ siteTagline() }}</span>
          </span>
        </a>

        <nav class="main-nav" aria-label="فهرست اصلی">
          <a
            routerLink="/"
            [routerLinkActiveOptions]="{ exact: true }"
            routerLinkActive="is-active"
          >
            صفحه اصلی
          </a>
          <a routerLink="/shop" routerLinkActive="is-active">فروشگاه</a>
          @for (category of categories(); track category._id) {
            <a [routerLink]="['/category', category.slug]" routerLinkActive="is-active">
              {{ category.name }}
            </a>
          }
        </nav>

        <div class="header-actions">
          <a
            class="btn btn-icon shop-nav-link"
            routerLink="/shop/cart"
            aria-label="سبد خرید"
            title="سبد خرید"
          >
            <app-icon name="cart" />
            @if (cartCount() > 0) {
              <span class="cart-badge">{{ cartCount() | faNumber }}</span>
            }
          </a>

          <button
            type="button"
            class="btn btn-icon"
            (click)="toggleSearch()"
            [attr.aria-expanded]="searchOpen()"
            aria-label="جستجو"
          >
            <app-icon [name]="searchOpen() ? 'close' : 'search'" />
          </button>

          <button
            type="button"
            class="btn btn-icon"
            (click)="theme.toggle()"
            [attr.aria-label]="theme.mode() === 'dark' ? 'حالت روشن' : 'حالت تاریک'"
            [title]="theme.mode() === 'dark' ? 'حالت روشن' : 'حالت تاریک'"
          >
            <app-icon [name]="theme.mode() === 'dark' ? 'sun' : 'moon'" />
          </button>

          @if (auth.isStaff()) {
            <a class="btn btn-soft btn-sm admin-link" routerLink="/admin">
              <app-icon name="dashboard" [size]="16" />
              پنل مدیریت
            </a>
          }

          <button
            type="button"
            class="btn btn-icon menu-toggle"
            (click)="mobileOpen.set(!mobileOpen())"
            [attr.aria-expanded]="mobileOpen()"
            aria-label="فهرست"
          >
            <app-icon [name]="mobileOpen() ? 'close' : 'menu'" />
          </button>
        </div>
      </div>

      @if (searchOpen()) {
        <div class="container">
          <form class="search-bar" (submit)="submitSearch($event)">
            <div class="input-search grow">
              <app-icon name="search" [size]="17" />
              <input
                #searchInput
                class="input"
                type="search"
                name="q"
                placeholder="جستجو در خبرها، مقالات و بررسی‌ها…"
                [value]="query()"
                (input)="query.set(searchInput.value)"
                autocomplete="off"
              />
            </div>
            <button type="submit" class="btn btn-primary">
              <app-icon name="search" [size]="16" />
              جستجو
            </button>
          </form>
        </div>
      }

      @if (mobileOpen()) {
        <nav class="mobile-nav" aria-label="فهرست موبایل">
          <a
            routerLink="/"
            [routerLinkActiveOptions]="{ exact: true }"
            routerLinkActive="is-active"
            (click)="closeMobile()"
          >
            صفحه اصلی
          </a>
          @for (category of categories(); track category._id) {
            <a
              [routerLink]="['/category', category.slug]"
              routerLinkActive="is-active"
              (click)="closeMobile()"
            >
              {{ category.name }}
            </a>
          }
          <a routerLink="/shop" routerLinkActive="is-active" (click)="closeMobile()">فروشگاه</a>
          <a routerLink="/shop/wishlist" routerLinkActive="is-active" (click)="closeMobile()"
            >علاقهمندیها</a
          >
          <a routerLink="/shop/orders" routerLinkActive="is-active" (click)="closeMobile()"
            >سفارشهای من</a
          >
          <a routerLink="/contact" routerLinkActive="is-active" (click)="closeMobile()"
            >تماس با ما</a
          >
          @if (auth.isLoggedIn()) {
            <a routerLink="/admin" (click)="closeMobile()">پنل کاربری</a>
          } @else {
            <a routerLink="/admin/login" (click)="closeMobile()">ورود / ثبت‌نام</a>
          }
        </nav>
      }
    </header>
  `,
  styles: `
    :host {
      display: block;
    }

    .admin-link {
      text-decoration: none;
    }

    @media (max-width: 620px) {
      .admin-link {
        display: none;
      }
    }
  `,
  host: {
    '(window:scroll)': 'onScroll()',
  },
})
export class SiteHeaderComponent {
  readonly categories = input<Category[]>([]);

  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);
  private readonly router = inject(Router);
  protected readonly cart = inject(CartService);

  protected readonly scrolled = signal(false);
  protected readonly mobileOpen = signal(false);
  protected readonly searchOpen = signal(false);
  protected readonly query = signal('');

  protected readonly siteName = computed(
    () => (this.settings.settings()['siteName'] as string) || 'زوم‌آیتی',
  );
  protected readonly siteTagline = computed(
    () => (this.settings.settings()['siteTagline'] as string) || 'رسانه فناوری',
  );
  protected readonly siteInitial = computed(() => this.siteName().charAt(0));

  /** Live cart badge — server count when signed in, local count otherwise. */
  protected readonly cartCount = computed(() => {
    if (this.auth.isLoggedIn()) return this.cart.itemsCount();
    return this.cart.localCount();
  });

  protected readonly faNumber = faNumber;

  protected onScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }

  protected toggleSearch(): void {
    this.searchOpen.update((open) => !open);
    if (!this.searchOpen()) this.query.set('');
  }

  protected submitSearch(event: Event): void {
    event.preventDefault();
    const term = this.query().trim();
    if (!term) return;
    this.searchOpen.set(false);
    void this.router.navigate(['/search'], { queryParams: { q: term } });
  }

  protected closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
