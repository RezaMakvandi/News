import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { SettingsService } from '../../../../core/services/settings.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { SettingGroup } from '../../../../core/models/settings.model';
import {
  SETTING_BOOLEAN_KEYS,
  SETTING_COLOR_KEYS,
  SETTING_GROUP_LABELS,
  SETTING_GROUP_ORDER,
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
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-5);
      align-items: start;
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

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.85rem;
      letter-spacing: 0.02em;
    }

    @media (max-width: 900px) {
      .settings-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class SettingsPage {
  private readonly settingsService = inject(SettingsService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly items = signal<SettingRow[]>([]);

  private readonly dirty = new Map<string, unknown>();

  constructor() {
    this.seo.set({ title: 'تنظیمات | پنل مدیریت' });
    this.load();
  }

  protected groups(): SettingGroup[] {
    const present = new Set(this.items().map((item) => item.group));
    return SETTING_GROUP_ORDER.filter((group) => present.has(group));
  }

  protected itemsByGroup(group: SettingGroup): SettingRow[] {
    return this.items().filter((item) => item.group === group);
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
    return key === 'postsPerPage' || key === 'shippingCost' || key === 'freeShippingFrom';
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
      case 'zarinpalMerchantId':
        return 'شناسه ۳۶ کاراکتری دریافتی از پنل زرین‌پال (UUID). خالی بودن در حالت تست از مرچنت پیش‌فرض سندباکس استفاده می‌کند.';
      case 'zarinpalSandbox':
        return 'در حالت تست، پرداخت‌ها در محیط آزمایشی زرین‌پال انجام می‌شوند و پول واقعی جابه‌جا نمی‌شود.';
      case 'payCallbackUrl':
        return 'آدرس بازگشت پس از پرداخت. خالی بگذارید تا به‌صورت خودکار ساخته شود.';
      default:
        return '';
    }
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
        this.settingsService.load().subscribe();
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
        this.items.set(response.items ?? []);
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
