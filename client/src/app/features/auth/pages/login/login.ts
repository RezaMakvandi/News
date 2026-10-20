import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { AuthService } from '../../../../core/services/auth.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ThemeService } from '../../../../core/services/theme.service';

interface DemoAccount {
  label: string;
  email: string;
  password: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { label: 'مدیر کل', email: 'admin@zoomit.local', password: 'Admin@123' },
  { label: 'سردبیر', email: 'editor@zoomit.local', password: 'Editor@123' },
  { label: 'نویسنده', email: 'author@zoomit.local', password: 'Author@123' },
];

@Component({
  selector: 'app-login-page',
  imports: [RouterLink, FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <div class="auth-head">
          <a class="brand" routerLink="/">
            <span class="brand-mark">
              <app-icon name="rss" [size]="22" />
            </span>
            <span class="brand-text">
              <span class="brand-name">زوم‌آیتی</span>
              <span class="brand-tag">حساب کاربری</span>
            </span>
          </a>
          <button
            type="button"
            class="btn btn-ghost btn-icon theme_btn"
            (click)="theme.toggle()"
            aria-label="تغییر پوسته"
          >
            <app-icon [name]="theme.mode() === 'dark' ? 'sun' : 'moon'" [size]="18" />
          </button>
        </div>

        <h1 class="auth-title">{{ mode() === 'login' ? 'ورود به حساب کاربری' : 'ساخت حساب کاربری' }}</h1>
        <p class="text-sm text-muted">
          @if (mode() === 'login') {
            برای خرید، ثبت نظر و استفاده از امکانات سایت وارد شوید.
          } @else {
            حساب کاربری خود را بسازید تا خرید کنید و نظر بدهید.
          }
        </p>

        <div class="auth-switch" role="tablist" aria-label="نوع عملیات">
          <button
            type="button"
            role="tab"
            class="auth-switch-btn"
            [class.is-active]="mode() === 'login'"
            [attr.aria-selected]="mode() === 'login'"
            (click)="setMode('login')"
          >
            ورود
          </button>
          <button
            type="button"
            role="tab"
            class="auth-switch-btn"
            [class.is-active]="mode() === 'register'"
            [attr.aria-selected]="mode() === 'register'"
            (click)="setMode('register')"
          >
            ثبت‌نام
          </button>
        </div>

        <form (submit)="submit($event)" class="stack-lg">
          @if (error()) {
            <div class="badge badge-danger auth-error">{{ error() }}</div>
          }

          @if (mode() === 'register') {
            <div class="field login_field">
              <label class="label" for="register-name">نام و نام خانوادگی</label>
              <input
                id="register-name"
                class="input"
                type="text"
                name="name"
                autocomplete="name"
                placeholder="نام خود را وارد کنید"
                [class.is-invalid]="fieldErrors()['name']"
                [(ngModel)]="name"
              />
              @if (fieldErrors()['name']) {
                <span class="error-text">{{ fieldErrors()['name'] }}</span>
              }
            </div>
          }

          <div class="field login_field">
            <label class="label" for="login-email">ایمیل</label>
            <input
              id="login-email"
              class="input"
              type="email"
              name="email"
              dir="ltr"
              autocomplete="email"
              placeholder="you@example.com"
              [class.is-invalid]="fieldErrors()['email']"
              [(ngModel)]="email"
            />
            @if (fieldErrors()['email']) {
              <span class="error-text">{{ fieldErrors()['email'] }}</span>
            }
          </div>

          <div class="field login_field">
            <label class="label" for="login-password">گذرواژه</label>
            <div class="password-wrap">
              <input
                id="login-password"
                class="input"
                [type]="showPassword() ? 'text' : 'password'"
                name="password"
                dir="ltr"
                [attr.autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'"
                placeholder="••••••••"
                [class.is-invalid]="fieldErrors()['password']"
                [(ngModel)]="password"
              />
              <button
                type="button"
                class="password-toggle"
                (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="showPassword() ? 'پنهان کردن گذرواژه' : 'نمایش گذرواژه'"
              >
                <app-icon [name]="showPassword() ? 'eyeOff' : 'eye'" [size]="16" />
              </button>
            </div>
            @if (fieldErrors()['password']) {
              <span class="error-text">{{ fieldErrors()['password'] }}</span>
            } @else if (mode() === 'register') {
              <span class="hint">گذرواژه باید حداقل ۶ کاراکتر باشد.</span>
            }
          </div>

          <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="submitting()">
            @if (submitting()) {
              <span class="spinner spinner-sm"></span>
            }
            {{ mode() === 'login' ? 'ورود' : 'ساخت حساب' }}
          </button>
        </form>

        <p class="auth-alt text-sm text-muted">
          @if (mode() === 'login') {
            حساب کاربری ندارید؟
            <button type="button" class="link-btn" (click)="setMode('register')">ثبت‌نام کنید</button>
          } @else {
            قبلاً ثبت‌نام کرده‌اید؟
            <button type="button" class="link-btn" (click)="setMode('login')">وارد شوید</button>
          }
        </p>

        @if (mode() === 'login') {
          <div class="demo-accounts">
            <p class="text-xs text-faint">حساب‌های نمایشی برای آزمایش سریع:</p>
            <div class="demo-grid">
              @for (account of demoAccounts; track account.email) {
                <button type="button" class="chip" (click)="fill(account)">
                  {{ account.label }}
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .auth-head {
      position: relative;
    }
    .theme_btn {
      position: absolute;
      left: 0;
      top: 0;
    }
    .login_field {
      margin-top: 0 !important ;
      margin-bottom: 0 !important;
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

    .auth-error {
      width: 100%;
      padding: var(--space-2) var(--space-3);
      text-align: center;
    }

    .stack-lg > * + * {
      margin-top: var(--space-4);
    }

    .auth-title {
      margin: 0 0 var(--space-1);
      font-size: 1.375rem;
    }

    .demo-grid {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
      margin-top: var(--space-2);
    }

    .auth-switch {
      display: flex;
      gap: 4px;
      padding: 4px;
      margin-bottom: var(--space-5);
      background: var(--bg-subtle);
      border-radius: var(--radius-sm);
    }

    .auth-switch-btn {
      flex: 1;
      padding: var(--space-2) var(--space-3);
      border: 0;
      border-radius: var(--radius-xs);
      background: transparent;
      color: var(--text-muted);
      font-size: 0.88rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition:
        background-color var(--transition-fast),
        color var(--transition-fast);

      &:hover {
        color: var(--text);
      }

      &.is-active {
        background: var(--surface);
        color: var(--accent);
        box-shadow: var(--shadow-xs);
      }
    }

    .link-btn {
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--accent);
      font-size: inherit;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }

    .auth-alt {
      margin: var(--space-4) 0 0;
      text-align: center;
    }

    .hint {
      display: block;
      margin-top: var(--space-1);
      font-size: 0.76rem;
      color: var(--text-faint);
    }
  `,
})
export class LoginPage {
  protected readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  protected email = '';
  protected password = '';
  protected name = '';
  protected readonly mode = signal<'login' | 'register'>('login');
  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly error = signal('');
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly demoAccounts = DEMO_ACCOUNTS;

  constructor() {
    this.seo.set({ title: 'ورود و ثبت‌نام | زوم‌آیتی' });
  }

  protected setMode(mode: 'login' | 'register'): void {
    this.mode.set(mode);
    this.fieldErrors.set({});
    this.error.set('');
  }

  protected fill(account: DemoAccount): void {
    this.email = account.email;
    this.password = account.password;
    this.fieldErrors.set({});
    this.error.set('');
  }

  protected submit(event: Event): void {
    event.preventDefault();

    const errors: Record<string, string> = {};
    if (this.mode() === 'register' && this.name.trim().length < 3) {
      errors['name'] = 'نام باید حداقل ۳ کاراکتر باشد';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) errors['email'] = 'ایمیل معتبر نیست';
    if (this.password.length < 6) errors['password'] = 'گذرواژه باید حداقل ۶ کاراکتر باشد';
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) return;

    this.submitting.set(true);
    this.error.set('');

    const action =
      this.mode() === 'register'
        ? this.auth.register(this.name.trim(), this.email.trim(), this.password)
        : this.auth.login(this.email.trim(), this.password);

    action.subscribe({
      next: () => {
        this.submitting.set(false);
        // Staff keep their admin destination; ordinary users return to the site.
        const redirect = this.route.snapshot.queryParamMap.get('redirect');
        const target = redirect && this.auth.isStaff() ? redirect : '/';
        void this.router.navigateByUrl(target);
      },
      error: (error: Error) => {
        this.submitting.set(false);
        this.error.set(error.message || 'عملیات ناموفق بود. دوباره تلاش کنید.');
      },
    });
  }
}
