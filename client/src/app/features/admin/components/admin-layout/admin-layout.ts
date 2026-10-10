import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { AuthService, ADMIN_ROLES } from '../../../../core/services/auth.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { SeoService } from '../../../../core/services/seo.service';
import { USER_ROLE_LABELS } from '../../../../core/models/user.model';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
  /** Only show to these roles; undefined means everyone on staff. */
  roles?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: '',
    items: [{ path: '/admin', label: 'داشبورد', icon: 'dashboard', exact: true }],
  },
  {
    label: 'مدیریت محتوا',
    items: [
      { path: '/admin/articles', label: 'اخبار و مقالات', icon: 'file' },
      { path: '/admin/categories', label: 'دسته‌بندی‌ها', icon: 'folder', roles: ADMIN_ROLES },
      { path: '/admin/tags', label: 'برچسب‌ها', icon: 'tag' },
      { path: '/admin/media', label: 'کتابخانه رسانه', icon: 'image' },
      { path: '/admin/pages', label: 'صفحات ثابت', icon: 'file', roles: ADMIN_ROLES },
    ],
  },
  {
    label: 'فروشگاه',
    items: [
      { path: '/admin/shop', label: 'داشبورد فروشگاه', icon: 'store', exact: true },
      { path: '/admin/shop/products', label: 'محصولات', icon: 'package' },
      { path: '/admin/shop/orders', label: 'سفارشها', icon: 'bag' },
      {
        path: '/admin/shop/categories',
        label: 'دستهبندی محصولات',
        icon: 'folder',
        roles: ADMIN_ROLES,
      },
      { path: '/admin/shop/brands', label: 'برندها', icon: 'store', roles: ADMIN_ROLES },
      { path: '/admin/shop/inventory', label: 'انبار و موجودی', icon: 'list' },
      { path: '/admin/shop/coupons', label: 'کدهای تخفیف', icon: 'ticket', roles: ADMIN_ROLES },
      { path: '/admin/shop/reviews', label: 'نظرات محصولات', icon: 'star' },
    ],
  },
  {
    label: 'ارتباط با مخاطب',
    items: [
      { path: '/admin/comments', label: 'مدیریت نظرات', icon: 'comment' },
      { path: '/admin/messages', label: 'پیام‌های تماس', icon: 'mail' },
      { path: '/admin/subscribers', label: 'اعضای خبرنامه', icon: 'users', roles: ADMIN_ROLES },
    ],
  },
  {
    label: 'سیستم',
    items: [
      { path: '/admin/users', label: 'کاربران', icon: 'user', roles: ADMIN_ROLES },
      { path: '/admin/settings', label: 'تنظیمات', icon: 'settings', roles: ADMIN_ROLES },
    ],
  },
];

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:resize)': 'onResize()' },
  template: `
    <div class="admin-shell" [class.is-collapsed]="collapsed()">
      @if (mobileOpen()) {
        <div class="sidebar-scrim" (click)="mobileOpen.set(false)"></div>
      }

      <aside class="admin-sidebar" [class.is-open]="mobileOpen()">
        <a class="admin-brand" routerLink="/">
          <span class="brand-mark">
            <app-icon name="rss" [size]="20" />
          </span>
          <span class="brand-text">
            <span class="brand-name">زوم‌آیتی</span>
            <span class="brand-tag">پنل مدیریت</span>
          </span>
        </a>

        <nav class="admin-nav">
          @for (group of visibleNav(); track group.label) {
            @if (group.label) {
              <p class="nav-group-label">{{ group.label }}</p>
            }
            @for (item of group.items; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="is-active"
                [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                (click)="mobileOpen.set(false)"
              >
                <app-icon [name]="item.icon" [size]="18" />
                <span>{{ item.label }}</span>
              </a>
            }
          }
        </nav>

        <div class="admin-sidebar-foot">
          <div class="sidebar-user">
            <span class="avatar-fallback">{{ userInitial() }}</span>
            <span class="sidebar-user-info">
              <span class="author-name">{{ auth.displayName() }}</span>
              <span class="author-sub">{{ roleLabel() }}</span>
            </span>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            (click)="logout()"
            aria-label="خروج از حساب"
          >
            <app-icon name="logout" [size]="18" />
          </button>
        </div>
      </aside>

      <div class="admin-main">
        <header class="admin-topbar">
          <button
            type="button"
            class="btn btn-ghost btn-icon menu-toggle"
            (click)="mobileOpen.set(true)"
            aria-label="باز کردن منو"
          >
            <app-icon name="menu" [size]="20" />
          </button>

          <button
            type="button"
            class="btn btn-ghost btn-icon"
            (click)="toggleCollapse()"
            [attr.aria-label]="collapsed() ? 'باز کردن نوار کناری' : 'جمع کردن نوار کناری'"
          >
            <app-icon [name]="collapsed() ? 'chevron-left' : 'chevron-right'" [size]="18" />
          </button>

          <div class="grow"></div>

          <a class="btn btn-ghost btn-icon" routerLink="/" aria-label="مشاهده سایت">
            <app-icon name="globe" [size]="18" />
          </a>
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            (click)="theme.toggle()"
            [attr.aria-label]="theme.mode() === 'dark' ? 'پوسته روشن' : 'پوسته تیره'"
          >
            <app-icon [name]="theme.mode() === 'dark' ? 'sun' : 'moon'" [size]="18" />
          </button>
        </header>

        <main class="admin-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .sidebar-user-info {
      display: grid;
      min-width: 0;
    }

    .sidebar-user-info .author-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .avatar-fallback {
      width: 38px;
      height: 38px;
      flex: none;
      border-radius: var(--radius-full);
      background: var(--accent-soft);
      color: var(--accent);
      display: grid;
      place-items: center;
      font-weight: 700;
    }

    .admin-topbar {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .admin-sidebar .is-active {
      background: var(--accent-soft);
      color: var(--accent);
    }
  `,
})
export class AdminLayoutComponent {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly settings = inject(SettingsService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  protected readonly collapsed = signal(false);
  protected readonly mobileOpen = signal(false);

  protected readonly roleLabel = computed(() => USER_ROLE_LABELS[this.auth.role() ?? 'subscriber']);
  protected readonly userInitial = computed(() =>
    (this.auth.displayName() || '؟').trim().charAt(0),
  );

  /** Hide nav groups whose every item is gated above the current role. */
  protected readonly visibleNav = computed(() => {
    const role = this.auth.role() ?? 'subscriber';
    return NAV.map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
    })).filter((group) => group.items.length > 0);
  });

  constructor() {
    this.settings.load().subscribe({ error: () => undefined });
    this.onResize();
  }

  protected toggleCollapse(): void {
    this.collapsed.update((value) => !value);
  }

  protected onResize(): void {
    if (window.innerWidth < 1080) {
      this.mobileOpen.set(false);
    }
  }

  protected logout(): void {
    this.auth.logout(false);
    void this.router.navigateByUrl('/');
  }
}
