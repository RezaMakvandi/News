import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { AuthService } from '../../../../core/services/auth.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { USER_ROLE_LABELS } from '../../../../core/models/user.model';

/** Ordinary-user account page — reachable for every signed-in role. */
@Component({
  selector: 'app-profile-page',
  imports: [FormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-banner">
      <div class="container">
        <h1>حساب کاربری من</h1>
        <p>اطلاعات حساب خود را ببینید و ویرایش کنید.</p>
      </div>
    </div>

    <div class="container page">
      <div class="profile-layout">
        <aside class="card card-pad profile-side">
          <div class="profile-identity">
            @if (auth.currentUser()?.avatar) {
              <img
                class="profile-avatar"
                [src]="auth.currentUser()!.avatar"
                [alt]="auth.displayName()"
              />
            } @else {
              <span class="profile-avatar profile-avatar-fallback">{{ userInitial() }}</span>
            }
            <div>
              <strong class="profile-name">{{ auth.displayName() || 'کاربر' }}</strong>
              <span class="profile-role">{{ roleLabel() }}</span>
            </div>
          </div>

          <nav class="profile-nav" aria-label="فهرست حساب کاربری">
            <a class="profile-nav-item is-active" routerLink="/profile">
              <app-icon name="user" [size]="16" />
              اطلاعات حساب
            </a>
            @if (shopEnabled()) {
              <a class="profile-nav-item" routerLink="/shop/orders">
                <app-icon name="bag" [size]="16" />
                سفارشهای من
              </a>
              <a class="profile-nav-item" routerLink="/shop/wishlist">
                <app-icon name="heart" [size]="16" />
                علاقهمندیها
              </a>
              <a class="profile-nav-item" routerLink="/shop/compare">
                <app-icon name="scale" [size]="16" />
                مقایسه محصولات
              </a>
            }
            <a class="profile-nav-item" routerLink="/profile/password">
              <app-icon name="lock" [size]="16" />
              تغییر گذرواژه
            </a>
            @if (auth.isStaff()) {
              <a class="profile-nav-item" routerLink="/admin">
                <app-icon name="dashboard" [size]="16" />
                پنل مدیریت
              </a>
            }
          </nav>
        </aside>

        <div class="card card-pad profile-main">
          <h2 class="profile-section-title">ویرایش اطلاعات</h2>

          <form (submit)="submit($event)" class="stack-lg">
            @if (error()) {
              <div class="badge badge-danger auth-error">{{ error() }}</div>
            }

            <div class="field">
              <label class="label" for="profile-name">نام و نام خانوادگی</label>
              <input
                id="profile-name"
                class="input"
                type="text"
                name="name"
                autocomplete="name"
                [class.is-invalid]="fieldErrors()['name']"
                [(ngModel)]="name"
              />
              @if (fieldErrors()['name']) {
                <span class="error-text">{{ fieldErrors()['name'] }}</span>
              }
            </div>

            <div class="field">
              <label class="label" for="profile-email">ایمیل</label>
              <input
                id="profile-email"
                class="input"
                type="email"
                dir="ltr"
                [value]="auth.currentUser()?.email"
                disabled
              />
              <span class="hint">ایمیل حساب کاربری قابل تغییر نیست.</span>
            </div>

            <div class="field">
              <label class="label" for="profile-avatar">نشانی تصویر پروفایل</label>
              <input
                id="profile-avatar"
                class="input"
                type="url"
                dir="ltr"
                name="avatar"
                placeholder="https://…"
                [(ngModel)]="avatar"
              />
            </div>

            <div class="field">
              <label class="label" for="profile-bio">درباره من</label>
              <textarea
                id="profile-bio"
                class="textarea"
                rows="4"
                name="bio"
                placeholder="چند خط درباره خودتان…"
                [(ngModel)]="bio"
              ></textarea>
            </div>

            <div class="row">
              <button type="submit" class="btn btn-primary" [disabled]="saving()">
                @if (saving()) {
                  <span class="spinner spinner-sm"></span>
                }
                ذخیره تغییرات
              </button>
              <button type="button" class="btn btn-ghost" (click)="reset()" [disabled]="saving()">
                بازگردانی
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: `
    .profile-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: var(--space-5);
      align-items: start;
    }

    .profile-identity {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
      margin-bottom: var(--space-4);
    }

    .profile-avatar {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-full);
      object-fit: cover;
      flex-shrink: 0;
    }

    .profile-avatar-fallback {
      display: grid;
      place-items: center;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 1.2rem;
      font-weight: 800;
    }

    .profile-name {
      display: block;
      font-size: 0.95rem;
      color: var(--text-strong);
    }

    .profile-role {
      font-size: 0.78rem;
      color: var(--text-faint);
    }

    .profile-nav {
      display: grid;
      gap: 2px;
    }

    .profile-nav-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-xs);
      color: var(--text-muted);
      font-size: 0.86rem;
      font-weight: 600;
      text-decoration: none;

      &:hover {
        background: var(--bg-hover);
        color: var(--text);
      }

      &.is-active {
        background: var(--accent-soft);
        color: var(--accent);
      }
    }

    .profile-section-title {
      margin: 0 0 var(--space-4);
      font-size: 1.05rem;
      color: var(--text-strong);
    }

    .auth-error {
      width: 100%;
      padding: var(--space-2) var(--space-3);
      text-align: center;
    }

    .stack-lg > * + * {
      margin-top: var(--space-4);
    }

    .hint {
      display: block;
      margin-top: var(--space-1);
      font-size: 0.76rem;
      color: var(--text-faint);
    }

    @media (max-width: 768px) {
      .profile-layout {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ProfilePage {
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  protected readonly settings = inject(SettingsService);

  protected readonly shopEnabled = this.settings.shopEnabled;

  protected name = '';
  protected avatar = '';
  protected bio = '';
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly fieldErrors = signal<Record<string, string>>({});

  protected readonly userInitial = computed(() => (this.auth.displayName() || '؟').trim().charAt(0));
  protected readonly roleLabel = computed(() => USER_ROLE_LABELS[this.auth.role() ?? 'subscriber']);

  constructor() {
    this.seo.set({ title: 'حساب کاربری من | زوم‌آیتی' });
    this.reset();
  }

  protected submit(event: Event): void {
    event.preventDefault();

    const errors: Record<string, string> = {};
    if (this.name.trim().length < 3) errors['name'] = 'نام باید حداقل ۳ کاراکتر باشد';
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) return;

    this.saving.set(true);
    this.error.set('');

    this.auth
      .updateProfile({
        name: this.name.trim(),
        avatar: this.avatar.trim(),
        bio: this.bio.trim(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('اطلاعات حساب کاربری شما ذخیره شد.');
        },
        error: (error: Error) => {
          this.saving.set(false);
          this.error.set(error.message || 'ذخیره اطلاعات ناموفق بود.');
        },
      });
  }

  protected reset(): void {
    const user = this.auth.currentUser();
    this.name = user?.name ?? '';
    this.avatar = user?.avatar ?? '';
    this.bio = user?.bio ?? '';
    this.fieldErrors.set({});
    this.error.set('');
  }
}
