import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { AuthService } from '../../../../core/services/auth.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';

/** Lets any signed-in user — ordinary customers included — change their password. */
@Component({
  selector: 'app-change-password-page',
  imports: [FormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-banner">
      <div class="container">
        <h1>تغییر گذرواژه</h1>
        <p>گذرواژه جدید خود را انتخاب کنید.</p>
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
              <span class="profile-role">{{ auth.currentUser()?.email }}</span>
            </div>
          </div>

          <nav class="profile-nav" aria-label="فهرست حساب کاربری">
            <a class="profile-nav-item" routerLink="/profile">
              <app-icon name="user" [size]="16" />
              اطلاعات حساب
            </a>
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
            <a class="profile-nav-item is-active" routerLink="/profile/password">
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
          <h2 class="profile-section-title">تغییر گذرواژه</h2>

          <form (submit)="submit($event)" class="stack-lg">
            @if (error()) {
              <div class="badge badge-danger auth-error">{{ error() }}</div>
            }

            <div class="field">
              <label class="label" for="current-password">گذرواژه فعلی</label>
              <div class="password-wrap">
                <input
                  id="current-password"
                  class="input"
                  [type]="showCurrent() ? 'text' : 'password'"
                  name="currentPassword"
                  dir="ltr"
                  autocomplete="current-password"
                  [class.is-invalid]="fieldErrors()['currentPassword']"
                  [(ngModel)]="currentPassword"
                />
                <button
                  type="button"
                  class="password-toggle"
                  (click)="showCurrent.set(!showCurrent())"
                  [attr.aria-label]="showCurrent() ? 'پنهان کردن گذرواژه' : 'نمایش گذرواژه'"
                >
                  <app-icon [name]="showCurrent() ? 'eyeOff' : 'eye'" [size]="16" />
                </button>
              </div>
              @if (fieldErrors()['currentPassword']) {
                <span class="error-text">{{ fieldErrors()['currentPassword'] }}</span>
              }
            </div>

            <div class="field">
              <label class="label" for="new-password">گذرواژه جدید</label>
              <div class="password-wrap">
                <input
                  id="new-password"
                  class="input"
                  [type]="showNew() ? 'text' : 'password'"
                  name="newPassword"
                  dir="ltr"
                  autocomplete="new-password"
                  [class.is-invalid]="fieldErrors()['newPassword']"
                  [(ngModel)]="newPassword"
                />
                <button
                  type="button"
                  class="password-toggle"
                  (click)="showNew.set(!showNew())"
                  [attr.aria-label]="showNew() ? 'پنهان کردن گذرواژه' : 'نمایش گذرواژه'"
                >
                  <app-icon [name]="showNew() ? 'eyeOff' : 'eye'" [size]="16" />
                </button>
              </div>
              @if (fieldErrors()['newPassword']) {
                <span class="error-text">{{ fieldErrors()['newPassword'] }}</span>
              } @else {
                <span class="hint">گذرواژه باید حداقل ۶ کاراکتر باشد.</span>
              }
            </div>

            <div class="field">
              <label class="label" for="confirm-password">تکرار گذرواژه جدید</label>
              <input
                id="confirm-password"
                class="input"
                [type]="showNew() ? 'text' : 'password'"
                name="confirmPassword"
                dir="ltr"
                autocomplete="new-password"
                [class.is-invalid]="fieldErrors()['confirmPassword']"
                [(ngModel)]="confirmPassword"
              />
              @if (fieldErrors()['confirmPassword']) {
                <span class="error-text">{{ fieldErrors()['confirmPassword'] }}</span>
              }
            </div>

            <div class="row">
              <button type="submit" class="btn btn-primary" [disabled]="saving()">
                @if (saving()) {
                  <span class="spinner spinner-sm"></span>
                }
                تغییر گذرواژه
              </button>
              <a class="btn btn-ghost" routerLink="/profile">انصراف</a>
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
      display: block;
      font-size: 0.76rem;
      color: var(--text-faint);
      direction: ltr;
      text-align: start;
      max-width: 170px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

    .password-wrap {
      position: relative;
    }

    .password-wrap .input {
      padding-inline-end: var(--space-6);
    }

    .password-toggle {
      position: absolute;
      right: 0;
      inset-inline-end: var(--space-2);
      top: 50%;
      translate: 0 -50%;
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border: 0;
      background: transparent;
      color: var(--text-faint);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .password-toggle:hover {
      color: var(--text);
      background: var(--bg-hover);
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
export class ChangePasswordPage {
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected currentPassword = '';
  protected newPassword = '';
  protected confirmPassword = '';
  protected readonly showCurrent = signal(false);
  protected readonly showNew = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly fieldErrors = signal<Record<string, string>>({});

  protected readonly userInitial = computed(() => (this.auth.displayName() || '؟').trim().charAt(0));

  constructor() {
    this.seo.set({ title: 'تغییر گذرواژه | زوم‌آیتی' });
  }

  protected submit(event: Event): void {
    event.preventDefault();

    const errors: Record<string, string> = {};
    if (!this.currentPassword) errors['currentPassword'] = 'گذرواژه فعلی را وارد کنید';
    if (this.newPassword.length < 6) errors['newPassword'] = 'گذرواژه باید حداقل ۶ کاراکتر باشد';
    if (this.newPassword !== this.confirmPassword) {
      errors['confirmPassword'] = 'تکرار گذرواژه مطابقت ندارد';
    }
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) return;

    this.saving.set(true);
    this.error.set('');

    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.toast.success('گذرواژه شما با موفقیت تغییر کرد.');
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.error.set(error.message || 'تغییر گذرواژه ناموفق بود.');
      },
    });
  }
}
