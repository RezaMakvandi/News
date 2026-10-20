import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../icon/icon';
import { ThemeService } from '../../../core/services/theme.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { FaNumberPipe } from '../../pipes/format.pipe';
import type { Category } from '../../../core/models/taxonomy.model';
import { faNumber } from '../../../core/utils/format';
import { USER_ROLE_LABELS } from '../../../core/models/user.model';

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

          @if (auth.isLoggedIn()) {
            <div #profileMenu class="profile-menu" [class.is-open]="profileOpen()">
              <button
                type="button"
                class="profile-trigger"
                (click)="toggleProfile(); $event.stopPropagation()"
                [attr.aria-expanded]="profileOpen()"
                aria-haspopup="menu"
                aria-label="حساب کاربری"
                [title]="auth.displayName() || 'حساب کاربری'"
              >
                @if (auth.currentUser()?.avatar) {
                  <img
                    class="profile-avatar"
                    [src]="auth.currentUser()!.avatar"
                    [alt]="auth.displayName()"
                  />
                } @else {
                  <span class="profile-avatar profile-avatar-fallback">{{ userInitial() }}</span>
                }
              </button>

              @if (profileOpen()) {
                <div class="profile-dropdown" role="menu" aria-label="حساب کاربری">
                  <div class="profile-head">
                    <span class="profile-head-name">{{ auth.displayName() || 'کاربر' }}</span>
                    <span class="profile-head-role">{{ roleLabel() }}</span>
                  </div>

                  <a
                    class="dropdown-item"
                    role="menuitem"
                    routerLink="/profile"
                    (click)="closeProfile()"
                  >
                    <app-icon name="user" [size]="16" />
                    حساب کاربری من
                  </a>
                  <a
                    class="dropdown-item"
                    role="menuitem"
                    routerLink="/shop/orders"
                    (click)="closeProfile()"
                  >
                    <app-icon name="bag" [size]="16" />
                    سفارشهای من
                  </a>
                  <a
                    class="dropdown-item"
                    role="menuitem"
                    routerLink="/shop/wishlist"
                    (click)="closeProfile()"
                  >
                    <app-icon name="heart" [size]="16" />
                    علاقهمندیها
                  </a>
                  <a
                    class="dropdown-item"
                    role="menuitem"
                    routerLink="/shop/compare"
                    (click)="closeProfile()"
                  >
                    <app-icon name="scale" [size]="16" />
                    مقایسه محصولات
                  </a>
                  @if (auth.isStaff()) {
                    <a
                      class="dropdown-item"
                      role="menuitem"
                      routerLink="/admin"
                      (click)="closeProfile()"
                    >
                      <app-icon name="dashboard" [size]="16" />
                      پنل مدیریت
                    </a>
                  }
                  <hr class="profile-divider" />
                  <button
                    type="button"
                    class="dropdown-item is-danger"
                    role="menuitem"
                    (click)="logout()"
                  >
                    <app-icon name="logout" [size]="16" />
                    خروج از حساب
                  </button>
                </div>
              }
            </div>
          } @else {
            <a class="login-link" routerLink="/login" (click)="closeMobile()">
              <app-icon name="user" [size]="17" />
              ورود
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
            <a routerLink="/profile" (click)="closeMobile()">حساب کاربری</a>
            @if (auth.isStaff()) {
              <a routerLink="/admin" (click)="closeMobile()">پنل مدیریت</a>
            }
          } @else {
            <a routerLink="/login" (click)="closeMobile()">ورود / ثبت‌نام</a>
          }
        </nav>
      }
    </header>
  `,
  styles: `
    :host {
      display: block;
    }

    /* ------------------------------ Login link ---------------------------- */

    .login-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 var(--space-3);
      border-radius: var(--radius-sm);
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-muted);
      transition:
        background-color var(--transition-fast),
        color var(--transition-fast);

      &:hover {
        background: var(--bg-hover);
        color: var(--accent);
      }
    }

    /* ----------------------------- Profile menu ---------------------------- */

    .profile-menu {
      position: relative;
    }

    .profile-trigger {
      display: inline-flex;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
    }

    .profile-avatar {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-full);
      object-fit: cover;
      box-shadow: 0 0 0 2px var(--border);
      transition: box-shadow var(--transition-fast);
    }

    .profile-trigger:hover .profile-avatar,
    .profile-menu.is-open .profile-avatar {
      box-shadow: 0 0 0 2px var(--accent);
    }

    .profile-avatar-fallback {
      display: grid;
      place-items: center;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 0.9rem;
      font-weight: 800;
    }

    .profile-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      inset-inline-end: 0;
      min-width: 205px;
      padding: 6px;
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow);
      z-index: var(--z-overlay);
      animation: fade-in 0.14s ease both;
    }

    .profile-head {
      display: grid;
      gap: 2px;
      padding: 8px 10px 10px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 6px;
    }

    .profile-head-name {
      font-size: 0.88rem;
      font-weight: 800;
      color: var(--text-strong);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .profile-head-role {
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--text-faint);
    }

    .profile-divider {
      margin: 6px 0;
      border: 0;
      border-top: 1px solid var(--border);
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: 8px 10px;
      border: 0;
      border-radius: var(--radius-xs);
      background: transparent;
      color: var(--text);
      font-size: 0.86rem;
      font-weight: 600;
      text-align: start;
      text-decoration: none;
      cursor: pointer;

      &:hover {
        background: var(--bg-hover);
      }

      &.is-danger {
        color: var(--danger);

        &:hover {
          background: var(--danger-soft);
        }
      }

      svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
    }
  `,
  host: {
    '(window:scroll)': 'onScroll()',
    '(document:click)': 'onDocumentClick($event)',
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
  protected readonly profileOpen = signal(false);

  private readonly profileMenu = viewChild<ElementRef<HTMLElement>>('profileMenu');

  protected readonly userInitial = computed(() =>
    (this.auth.displayName() || '؟').trim().charAt(0),
  );
  protected readonly roleLabel = computed(() => USER_ROLE_LABELS[this.auth.role() ?? 'subscriber']);

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

  /** Close the profile dropdown when clicking anywhere outside it. */
  protected onDocumentClick(event: MouseEvent): void {
    const menu = this.profileMenu()?.nativeElement;
    if (menu && !menu.contains(event.target as Node)) {
      this.profileOpen.set(false);
    }
  }

  protected toggleProfile(): void {
    this.profileOpen.update((open) => !open);
  }

  protected closeProfile(): void {
    this.profileOpen.set(false);
  }

  protected logout(): void {
    this.profileOpen.set(false);
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }
}
