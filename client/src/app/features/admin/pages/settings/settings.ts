import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { AdminService } from '../../../../core/services/admin.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { SettingGroup } from '../../../../core/models/settings.model';
import {
  SETTING_BOOLEAN_KEYS,
  SETTING_COLOR_KEYS,
  SETTING_GROUP_LABELS,
  SETTING_GROUP_ORDER,
  SETTING_MANAGED_KEYS,
  SETTING_SECRET_KEYS,
} from '../../../../core/models/settings.model';

interface SettingRow {
  key: string;
  value: unknown;
  label: string;
  group: SettingGroup;
}

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule, IconComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>تنظیمات سایت</h1>
        <p class="text-sm text-muted">
          پیکربندی عمومی، سئو، شبکه‌های اجتماعی، فروشگاه و درگاه پرداخت.
        </p>
      </div>
      <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving()">
        @if (saving()) {
          <span class="spinner spinner-sm"></span>
        } @else {
          <app-icon name="check" [size]="18" />
        }
        ذخیره تنظیمات
      </button>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری تنظیمات…" />
    } @else {
      <div class="settings-tabs" role="tablist" aria-label="بخش تنظیمات">
        <button
          type="button"
          class="settings-tab"
          [class.is-active]="settingsTab() === 'general'"
          (click)="settingsTab.set('general')"
        >
          عمومی
        </button>
        <button
          type="button"
          class="settings-tab"
          [class.is-active]="settingsTab() === 'shop'"
          (click)="settingsTab.set('shop')"
        >
          فروشگاه
        </button>
      </div>

      <div class="settings-grid">
        @for (group of groups(); track group) {
          <div class="card card-pad">
            <h3 class="card-title">{{ groupLabel(group) }}</h3>

            <div class="stack-lg">
              @for (item of itemsByGroup(group); track item.key) {
                <div class="field">
                  @if (isBoolean(item.key)) {
                    <div class="row">
                      <label class="switch">
                        <input
                          type="checkbox"
                          [checked]="asBool(item.value)"
                          (change)="setValue(item.key, $any($event.target).checked)"
                        />
                        <span class="track"></span>
                      </label>
                      <span class="text-sm">{{ item.label }}</span>
                    </div>
                  } @else if (isColor(item.key)) {
                    <label class="label">{{ item.label }}</label>
                    <div class="color-input-row">
                      <input
                        type="color"
                        [ngModel]="asString(item.value)"
                        (ngModelChange)="setValue(item.key, $event)"
                      />
                      <input
                        class="input"
                        dir="ltr"
                        [ngModel]="asString(item.value)"
                        (ngModelChange)="setValue(item.key, $event)"
                      />
                    </div>
                  } @else if (isLongText(item.key)) {
                    <label class="label">{{ item.label }}</label>
                    <textarea
                      class="textarea"
                      rows="3"
                      [ngModel]="asString(item.value)"
                      (ngModelChange)="setValue(item.key, $event)"
                    ></textarea>
                  } @else if (item.key === 'themeDefault') {
                    <label class="label">{{ item.label }}</label>
                    <select
                      class="input"
                      [ngModel]="asString(item.value)"
                      (ngModelChange)="setValue(item.key, $event)"
                    >
                      <option value="light">روشن</option>
                      <option value="dark">تاریک</option>
                    </select>
                  } @else if (isNumber(item.key)) {
                    <label class="label">{{ item.label }}</label>
                    <input
                      class="input"
                      type="number"
                      [min]="item.key === 'postsPerPage' ? 1 : 0"
                      [max]="item.key === 'postsPerPage' ? 60 : 1000000000"
                      [ngModel]="asNumber(item.value)"
                      (ngModelChange)="setValue(item.key, $event)"
                    />
                  } @else if (isMerchantId(item.key)) {
                    <label class="label">{{ item.label }}</label>
                    <input
                      class="input mono"
                      type="text"
                      dir="ltr"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      [ngModel]="asString(item.value)"
                      (ngModelChange)="setValue(item.key, $event)"
                    />
                  } @else if (isSecret(item.key)) {
                    <label class="label">{{ item.label }}</label>
                    <input
                      class="input"
                      type="password"
                      dir="ltr"
                      autocomplete="new-password"
                      placeholder="••••••••"
                      [ngModel]="asString(item.value)"
                      (ngModelChange)="setValue(item.key, $event)"
                    />
                  } @else {
                    <label class="label">{{ item.label }}</label>
                    <input
                      class="input"
                      [dir]="isUrlLike(item.key) ? 'ltr' : 'auto'"
                      [ngModel]="asString(item.value)"
                      (ngModelChange)="setValue(item.key, $event)"
                    />
                  }
                  @if (hintFor(item.key)) {
                    <p class="field-hint">{{ hintFor(item.key) }}</p>
                  }
                </div>
              }
            </div>

            @if (group === 'mail') {
              <div class="mail-test">
                <p class="field-hint">
                  پس از ذخیره تنظیمات، برای اطمینان از درستی اطلاعات SMTP یک ایمیل آزمایشی بفرستید.
                </p>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  (click)="sendTestMail()"
                  [disabled]="testingMail()"
                >
                  @if (testingMail()) {
                    <span class="spinner spinner-sm"></span>
                  } @else {
                    <app-icon name="send" [size]="14" />
                  }
                  ارسال ایمیل آزمایشی
                </button>
              </div>
            }
          </div>
        }
      </div>

      <div class="row" style="justify-content: flex-end; margin-top: var(--space-5)">
        <button type="button" class="btn btn-primary btn-lg" (click)="save()" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner spinner-sm"></span>
          }
          ذخیره همه تنظیمات
        </button>
      </div>
    }
  `,
  styles: `
    .settings-tabs {
      display: inline-flex;
      gap: var(--space-2);
      margin-bottom: var(--space-5);
      padding: var(--space-1);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-subtle, var(--bg-hover));
    }

    .settings-tab {
      padding: var(--space-2) var(--space-4);
      border: 0;
      border-radius: var(--radius-xs);
      background: transparent;
      color: var(--text-muted);
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .settings-tab:hover {
      color: var(--text);
    }

    .settings-tab.is-active {
      background: var(--accent);
      color: #fff;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-5);
    }

    .stack-lg > * + * {
      margin-top: var(--space-4);
    }

    .field-hint {
      margin: 0.375rem 0 0;
      font-size: 0.8rem;
      line-height: 1.6;
      color: var(--text-muted);
    }

    .mail-test {
      margin-top: var(--space-4);
      padding-top: var(--space-4);
      border-top: 1px dashed var(--border);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      align-items: flex-start;
    }

    .mail-test .field-hint {
      margin: 0;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.85rem;
      letter-spacing: 0.02em;
    }

    @media (max-width: 900px) {
      .settings-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class SettingsPage {
  private readonly settingsService = inject(SettingsService);
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly testingMail = signal(false);
  protected readonly items = signal<SettingRow[]>([]);
  protected readonly settingsTab = signal<'general' | 'shop'>('general');

  private readonly dirty = new Map<string, unknown>();

  constructor() {
    this.seo.set({ title: 'تنظیمات | پنل مدیریت' });
    this.load();
  }

  protected groups(): SettingGroup[] {
    const present = new Set(this.items().map((item) => item.group));
    const tabGroups =
      this.settingsTab() === 'shop'
        ? (['shop', 'payment'] as SettingGroup[])
        : (['general', 'appearance', 'content', 'social', 'seo', 'footer', 'mail'] as SettingGroup[]);
    return SETTING_GROUP_ORDER.filter((group) => tabGroups.includes(group) && present.has(group));
  }

  protected itemsByGroup(group: SettingGroup): SettingRow[] {
    const rows = this.items().filter((item) => item.group === group);
    if (group === 'shop') {
      // The master switch leads the shop card.
      const index = rows.findIndex((item) => item.key === 'shopEnabled');
      if (index > 0) {
        const [switchRow] = rows.splice(index, 1);
        rows.unshift(switchRow);
      }
    }
    return rows;
  }

  protected groupLabel(group: SettingGroup): string {
    return SETTING_GROUP_LABELS[group] ?? group;
  }

  protected isBoolean(key: string): boolean {
    return SETTING_BOOLEAN_KEYS.has(key);
  }

  protected isColor(key: string): boolean {
    return SETTING_COLOR_KEYS.has(key);
  }

  protected isNumber(key: string): boolean {
    return (
      key === 'postsPerPage' ||
      key === 'shippingCost' ||
      key === 'freeShippingFrom' ||
      key === 'smtpPort'
    );
  }

  protected isSecret(key: string): boolean {
    return SETTING_SECRET_KEYS.has(key);
  }

  protected isLongText(key: string): boolean {
    return key === 'siteDescription' || key === 'footerText';
  }

  protected isUrlLike(key: string): boolean {
    return key.startsWith('social') || key === 'accentColor' || key === 'payCallbackUrl';
  }

  protected isMerchantId(key: string): boolean {
    return key === 'zarinpalMerchantId';
  }

  /** Hint shown under a setting, if any. */
  protected hintFor(key: string): string {
    switch (key) {
      case 'shopEnabled':
        return 'با غیرفعال کردن، منوی فروشگاه و همه بخشهای فروشگاه در سایت پنهان میشود و مسیرهای آن در دسترس نخواهد بود. مدیران همچنان از پنل به صفحات فروشگاه دسترسی دارند.';
      case 'zarinpalMerchantId':
        return 'شناسه ۳۶ کاراکتری دریافتی از پنل زرین‌پال (UUID). خالی بودن در حالت تست از مرچنت پیش‌فرض سندباکس استفاده می‌کند.';
      case 'zarinpalSandbox':
        return 'در حالت تست، پرداخت‌ها در محیط آزمایشی زرین‌پال انجام می‌شوند و پول واقعی جابه‌جا نمی‌شود.';
      case 'payCallbackUrl':
        return 'آدرس بازگشت پس از پرداخت. خالی بگذارید تا به‌صورت خودکار ساخته شود.';
      case 'adminEmail':
        return 'پاسخ پیامهای فرم تماس از این ایمیل ارسال میشود. بهتر است با نام کاربری SMTP یکسان باشد.';
      case 'smtpHost':
        return 'آدرس سرور ایمیل، مثل smtp.gmail.com یا mail.example.com. تا زمانی که این مقدار خالی باشد امکان پاسخدهی ایمیلی وجود ندارد.';
      case 'smtpPort':
        return 'معمولاً ۵۸۷ برای STARTTLS و ۴۶۵ برای SSL.';
      case 'smtpSecure':
        return 'برای پورت ۴۶۵ فعال کنید؛ برای پورت ۵۸۷ غیرفعال بگذارید.';
      case 'smtpUser':
        return 'در بیشتر سرویسها با ایمیل فرستنده یکسان است.';
      case 'smtpPass':
        return this.smtpPassHint();
      default:
        return '';
    }
  }

  /** Hint under the SMTP password field, including the stored length. */
  private smtpPassHint(): string {
    const base =
      'برای Gmail رمز اصلی کار نمیکند؛ باید تأیید دو مرحلهای را روشن کرده و از myaccount.google.com/apppasswords یک «رمز برنامه» (App Password) ۱۶ کاراکتری بسازید. فاصلههای داخل رمز برنامه مشکلی ایجاد نمیکند.';

    const row = this.items().find((item) => item.key === 'smtpPass');
    const length = typeof row?.value === 'string' ? row.value.length : 0;
    if (!length) return base;

    const host = this.items().find((item) => item.key === 'smtpHost');
    const hostValue = typeof host?.value === 'string' ? host.value : '';
    const isGmail = /gmail\.com$|googlemail\.com$/i.test(hostValue);

    if (isGmail && length !== 16) {
      return `${base} (رمز ذخیرهشده ${length} کاراکتر است؛ رمز برنامه گوگل باید ۱۶ کاراکتر باشد.)`;
    }
    return `${base} (طول رمز ذخیرهشده: ${length} کاراکتر)`;
  }

  protected asBool(value: unknown): boolean {
    return value === true || value === 'true';
  }

  protected asString(value: unknown): string {
    if (Array.isArray(value)) return value.join('، ');
    return value === null || value === undefined ? '' : String(value);
  }

  protected asNumber(value: unknown): number {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return num;
  }

  protected setValue(key: string, value: unknown): void {
    this.dirty.set(key, value);
  }

  /** Sends a test email using the currently saved SMTP settings. */
  protected sendTestMail(): void {
    if (this.dirty.size) {
      this.toast.info('ابتدا تنظیمات را ذخیره کنید، سپس ایمیل آزمایشی بفرستید');
      return;
    }

    this.testingMail.set(true);
    const to = this.items().find((item) => item.key === 'adminEmail');
    const email = typeof to?.value === 'string' ? to.value : undefined;

    this.adminService.sendTestMail(email || undefined).subscribe({
      next: () => {
        this.testingMail.set(false);
        this.toast.success('ایمیل آزمایشی ارسال شد. صندوق ورودی را بررسی کنید.');
      },
      error: (error: Error) => {
        this.testingMail.set(false);
        this.toast.error(error.message || 'ارسال ایمیل آزمایشی ناموفق بود');
      },
    });
  }

  protected save(): void {
    if (!this.dirty.size) {
      this.toast.info('تغییری برای ذخیره وجود ندارد');
      return;
    }

    this.saving.set(true);
    const items = [...this.dirty.entries()].map(([key, value]) => ({ key, value }));

    this.settingsService.adminSave(items).subscribe({
      next: () => {
        this.saving.set(false);
        this.dirty.clear();
        this.toast.success('تنظیمات ذخیره شد');
        this.settingsService.load(true).subscribe();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.error(error.message || 'ذخیره تنظیمات انجام نشد');
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.settingsService.adminGet().subscribe({
      next: (response) => {
        this.items.set(
          (response.items ?? []).filter((item) => !SETTING_MANAGED_KEYS.has(item.key)),
        );
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
        this.toast.error('بارگذاری تنظیمات انجام نشد');
      },
    });
  }
}
