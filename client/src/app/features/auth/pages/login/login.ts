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
              <span class="brand-tag">پنل مدیریت</span>
            </span>
          </a>
          <button type="button" class="btn btn-ghost btn-icon" (click)="theme.toggle()" aria-label="تغییر پوسته">
            <app-icon [name]="theme.mode() === 'dark' ? 'sun' : 'moon'" [size]="18" />
          </button>
        </div>

        <h1 class="auth-title">ورود به حساب کاربری</h1>
        <p class="text-sm text-muted">برای دسترسی به پنل مدیریت وارد شوید.</p>

        <form (submit)="submit($event)" class="stack-lg">
          @if (error()) {
            <div class="badge badge-danger auth-error">{{ error() }}</div>
          }

          <div class="field">
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

          <div class="field">
            <label class="label" for="login-password">گذرواژه</label>
            <div class="password-wrap">
              <input
                id="login-password"
                class="input"
                [type]="showPassword() ? 'text' : 'password'"
                name="password"
                dir="ltr"
                autocomplete="current-password"
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
                <app-icon [name]="showPassword() ? 'eye' : 'eye'" [size]="16" />
              </button>
            </div>
            @if (fieldErrors()['password']) {
              <span class="error-text">{{ fieldErrors()['password'] }}</span>
            }
          </div>

          <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="submitting()">
            @if (submitting()) {
              <span class="spinner spinner-sm"></span>
            }
            ورود به پنل
          </button>
        </form>

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
      </div>
    </div>
  `,
  styles: `
    .password-wrap {
      position: relative;
    }

    .password-wrap .input {
      padding-inline-end: var(--space-6);
    }

    .password-toggle {
      position: absolute;
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
  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly error = signal('');
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly demoAccounts = DEMO_ACCOUNTS;

  constructor() {
    this.seo.set({ title: 'ورود به پنل مدیریت' });
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) errors['email'] = 'ایمیل معتبر نیست';
    if (this.password.length < 6) errors['password'] = 'گذرواژه باید حداقل ۶ کاراکتر باشد';
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) return;

    this.submitting.set(true);
    this.error.set('');

    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.submitting.set(false);
        if (this.auth.isStaff()) {
          const redirect = this.route.snapshot.queryParamMap.get('redirect') || '/admin';
          void this.router.navigateByUrl(redirect);
        } else {
          this.auth.logout(false);
          this.error.set('این حساب دسترسی به پنل مدیریت ندارد.');
        }
      },
      error: (error: Error) => {
        this.submitting.set(false);
        this.error.set(error.message || 'ورود ناموفق بود. دوباره تلاش کنید.');
      },
    });
  }
}