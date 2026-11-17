import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { MediaPickerModalComponent } from '../media-picker-modal/media-picker-modal';
import type { MediaItem } from '../../../../core/models/media.model';
import {
  DEFAULT_FOOTER_CONFIG,
  cloneFooterConfig,
  type FooterConfig,
  type FooterSectionSource,
} from '../../../../core/models/footer.model';

/**
 * Visual editor for the public site footer: brand column, ordered link
 * sections, custom links and trust badges (اینماد و …).
 */
@Component({
  selector: 'app-footer-editor',
  imports: [FormsModule, IconComponent, MediaPickerModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card card-pad footer-editor">
      <div class="editor-head">
        <div>
          <h3 class="card-title">شخصی‌سازی فوتر</h3>
          <p class="field-hint">
            چیدمان ستون‌ها، لینک‌ها، لوگو و نشان‌های اعتماد (مثل اینماد) را مدیریت کنید.
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" (click)="reset()">
          <app-icon name="refresh" [size]="14" />
          بازنشانی به پیش‌فرض
        </button>
      </div>

      <div class="toggle-grid">
        <label class="toggle-row">
          <span class="switch">
            <input
              type="checkbox"
              [checked]="draft().showBrand"
              (change)="setFlag('showBrand', $any($event.target).checked)"
            />
            <span class="track"></span>
          </span>
          <span>ستون برند و «درباره ما»</span>
        </label>

        <label class="toggle-row">
          <span class="switch">
            <input
              type="checkbox"
              [checked]="draft().showSocials"
              (change)="setFlag('showSocials', $any($event.target).checked)"
            />
            <span class="track"></span>
          </span>
          <span>آیکون شبکه‌های اجتماعی</span>
        </label>

        <label class="toggle-row">
          <span class="switch">
            <input
              type="checkbox"
              [checked]="draft().showNewsletter"
              (change)="setFlag('showNewsletter', $any($event.target).checked)"
            />
            <span class="track"></span>
          </span>
          <span>ستون خبرنامه</span>
        </label>
      </div>

      <div class="two-col">
        <div class="field">
          <label class="label">لوگوی فوتر</label>
          <div class="media-row">
            @if (draft().logo) {
              <img class="logo-preview" [src]="draft().logo" alt="لوگوی فوتر" />
            } @else {
              <span class="logo-placeholder">
                <app-icon name="image" [size]="22" />
              </span>
            }
            <div class="grow">
              <input
                class="input"
                dir="ltr"
                placeholder="https://… یا /api/media/…"
                [ngModel]="draft().logo"
                (ngModelChange)="setLogo($event)"
              />
              <div class="row-actions">
                <button type="button" class="btn btn-ghost btn-sm" (click)="openPicker('logo')">
                  <app-icon name="image" [size]="14" />
                  انتخاب از رسانه
                </button>
                @if (draft().logo) {
                  <button type="button" class="btn btn-danger-soft btn-sm" (click)="setLogo('')">
                    حذف
                  </button>
                }
              </div>
              <p class="field-hint">خالی بگذارید تا از لوگوی اصلی سایت استفاده شود.</p>
            </div>
          </div>
        </div>

        <div class="field">
          <label class="label">متن «درباره ما» در فوتر</label>
          <textarea
            class="textarea"
            rows="4"
            placeholder="خالی بگذارید تا توضیح سایت نمایش داده شود."
            [ngModel]="draft().about"
            (ngModelChange)="patch({ about: $event })"
          ></textarea>
        </div>
      </div>

      <div class="editor-head section-heading">
        <div>
          <h4>بخش‌های فوتر</h4>
          <p class="field-hint">ترتیب ستون‌ها و لینک‌های داخل هر ستون را با فلش‌ها تغییر دهید.</p>
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          (click)="addSection()"
          [disabled]="draft().sections.length >= 8"
        >
          <app-icon name="plus-circle" [size]="16" />
          افزودن بخش
        </button>
      </div>

      @for (section of draft().sections; track $index; let sectionIndex = $index) {
        <div class="subsection">
          <div class="subsection-head">
            <span class="index-badge">{{ sectionIndex + 1 }}</span>
            <input
              class="input"
              placeholder="عنوان بخش، مثل دسترسی سریع"
              [ngModel]="section.title"
              (ngModelChange)="setSectionTitle(sectionIndex, $event)"
            />
            <select
              class="input source-select"
              [ngModel]="section.source"
              (ngModelChange)="setSectionSource(sectionIndex, $event)"
            >
              <option value="custom">لینک‌های دلخواه</option>
              <option value="categories">دسته‌بندی‌های خبری</option>
              <option value="pages">صفحات سایت</option>
            </select>
            <div class="reorder">
              <button
                type="button"
                class="btn btn-ghost btn-icon"
                (click)="moveSection(sectionIndex, -1)"
                [disabled]="sectionIndex === 0"
                aria-label="انتقال به بالا"
              >
                <app-icon name="arrow-up" [size]="16" />
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-icon"
                (click)="moveSection(sectionIndex, 1)"
                [disabled]="sectionIndex === draft().sections.length - 1"
                aria-label="انتقال به پایین"
              >
                <app-icon name="arrow-down" [size]="16" />
              </button>
              <button
                type="button"
                class="btn btn-danger-soft btn-icon"
                (click)="removeSection(sectionIndex)"
                aria-label="حذف بخش"
              >
                <app-icon name="trash" [size]="16" />
              </button>
            </div>
          </div>

          @if (section.source !== 'custom') {
            <p class="field-hint">
              لینک‌های این بخش به‌صورت خودکار از
              {{ section.source === 'categories' ? 'دسته‌بندی‌ها' : 'صفحات سایت' }}
              ساخته می‌شوند؛ لینک‌های زیر به آن‌ها اضافه می‌شوند.
            </p>
          }

          <div class="link-list">
            @for (link of section.links; track $index; let linkIndex = $index) {
              <div class="link-row">
                <input
                  class="input"
                  placeholder="عنوان لینک"
                  [ngModel]="link.label"
                  (ngModelChange)="setLink(sectionIndex, linkIndex, { label: $event })"
                />
                <input
                  class="input"
                  dir="ltr"
                  placeholder="/contact یا https://…"
                  [ngModel]="link.url"
                  (ngModelChange)="setLink(sectionIndex, linkIndex, { url: $event })"
                />
                <div class="reorder">
                  <button
                    type="button"
                    class="btn btn-ghost btn-icon"
                    (click)="moveLink(sectionIndex, linkIndex, -1)"
                    [disabled]="linkIndex === 0"
                    aria-label="انتقال لینک به بالا"
                  >
                    <app-icon name="arrow-up" [size]="14" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-icon"
                    (click)="moveLink(sectionIndex, linkIndex, 1)"
                    [disabled]="linkIndex === section.links.length - 1"
                    aria-label="انتقال لینک به پایین"
                  >
                    <app-icon name="arrow-down" [size]="14" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-danger-soft btn-icon"
                    (click)="removeLink(sectionIndex, linkIndex)"
                    aria-label="حذف لینک"
                  >
                    <app-icon name="trash" [size]="14" />
                  </button>
                </div>
              </div>
            }
          </div>

          <button
            type="button"
            class="btn btn-ghost btn-sm"
            (click)="addLink(sectionIndex)"
            [disabled]="section.links.length >= 15"
          >
            <app-icon name="plus-circle" [size]="15" />
            افزودن لینک
          </button>
        </div>
      }

      <div class="editor-head section-heading">
        <div>
          <h4>نشان‌ها و تصاویر فوتر</h4>
          <p class="field-hint">
            تصاویر اعتماد مثل اینماد، ساماندهی یا لوگوی حامیان را اضافه کنید.
          </p>
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          (click)="addBadge()"
          [disabled]="draft().badges.length >= 10"
        >
          <app-icon name="plus-circle" [size]="16" />
          افزودن نشان
        </button>
      </div>

      @for (badge of draft().badges; track $index) {
        <div class="badge-row">
          <div class="badge-thumb">
            @if (badge.image) {
              <img [src]="badge.image" [alt]="badge.alt || 'نشان'" />
            } @else {
              <app-icon name="image" [size]="20" />
            }
          </div>

          <div class="grow">
            <input
              class="input"
              dir="ltr"
              placeholder="آدرس تصویر نشان"
              [ngModel]="badge.image"
              (ngModelChange)="setBadge($index, { image: $event })"
            />
            <div class="row-actions">
              <button type="button" class="btn btn-ghost btn-sm" (click)="openPicker('badge:' + $index)">
                <app-icon name="image" [size]="14" />
                انتخاب از رسانه
              </button>
            </div>
            <div class="two-col tight">
              <input
                class="input"
                placeholder="متن جایگزین (alt)"
                [ngModel]="badge.alt"
                (ngModelChange)="setBadge($index, { alt: $event })"
              />
              <input
                class="input"
                dir="ltr"
                placeholder="لینک نشان (اختیاری)"
                [ngModel]="badge.url"
                (ngModelChange)="setBadge($index, { url: $event })"
              />
            </div>
          </div>

          <div class="reorder">
            <button
              type="button"
              class="btn btn-ghost btn-icon"
              (click)="moveBadge($index, -1)"
              [disabled]="$index === 0"
              aria-label="انتقال نشان به بالا"
            >
              <app-icon name="arrow-up" [size]="16" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-icon"
              (click)="moveBadge($index, 1)"
              [disabled]="$index === draft().badges.length - 1"
              aria-label="انتقال نشان به پایین"
            >
              <app-icon name="arrow-down" [size]="16" />
            </button>
            <button
              type="button"
              class="btn btn-danger-soft btn-icon"
              (click)="removeBadge($index)"
              aria-label="حذف نشان"
            >
              <app-icon name="trash" [size]="16" />
            </button>
          </div>
        </div>
      }

      <div class="field copyright">
        <label class="label">متن کپی‌رایت فوتر</label>
        <input
          class="input"
          placeholder="خالی بگذارید تا از «متن پاورقی» تنظیمات استفاده شود."
          [ngModel]="draft().copyright"
          (ngModelChange)="patch({ copyright: $event })"
        />
      </div>
    </div>

    @if (pickerOpen()) {
      <app-media-picker-modal
        [open]="true"
        mode="image"
        title="انتخاب تصویر فوتر"
        (picked)="onPicked($event)"
        (closed)="pickerOpen.set(false)"
      />
    }
  `,
  styles: `
    .footer-editor {
      display: grid;
      gap: var(--space-5);
    }

    .editor-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      flex-wrap: wrap;
    }

    .editor-head .field-hint {
      margin: 0.25rem 0 0;
    }

    .section-heading {
      margin-top: var(--space-2);
      padding-top: var(--space-4);
      border-top: 1px dashed var(--border);
    }

    .toggle-grid {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3) var(--space-5);
    }

    .toggle-row {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.85rem;
      cursor: pointer;
    }

    .two-col {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-4);
    }

    .two-col.tight {
      gap: var(--space-2);
      margin-top: var(--space-2);
    }

    .media-row {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
    }

    .logo-preview,
    .logo-placeholder {
      width: 96px;
      height: 64px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-inset);
      object-fit: contain;
      display: grid;
      place-items: center;
      color: var(--text-faint);
      flex: 0 0 auto;
    }

    .logo-preview {
      background: #fff;
      padding: 6px;
    }

    .row-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-top: var(--space-2);
    }

    .subsection {
      padding: var(--space-4);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-subtle, var(--bg-inset));
      display: grid;
      gap: var(--space-3);
    }

    .subsection-head {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    .subsection-head > .input:first-of-type {
      flex: 1 1 220px;
    }

    .source-select {
      flex: 0 0 190px;
    }

    .index-badge {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border-radius: var(--radius-full);
      background: var(--accent-softer);
      color: var(--accent);
      font-size: 0.78rem;
      font-weight: 700;
      flex: 0 0 auto;
    }

    .reorder {
      display: inline-flex;
      gap: 2px;
      flex: 0 0 auto;
    }

    .link-list {
      display: grid;
      gap: var(--space-2);
    }

    .link-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr) auto;
      gap: var(--space-2);
      align-items: center;
    }

    .badge-row {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-3);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }

    .badge-thumb {
      width: 84px;
      height: 64px;
      border: 1px solid var(--border);
      border-radius: var(--radius-xs);
      background: #fff;
      display: grid;
      place-items: center;
      overflow: hidden;
      flex: 0 0 auto;
      color: var(--text-faint);
    }

    .badge-thumb img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .copyright {
      padding-top: var(--space-4);
      border-top: 1px dashed var(--border);
    }

    .field-hint {
      margin: 0.375rem 0 0;
      font-size: 0.8rem;
      line-height: 1.6;
      color: var(--text-muted);
    }

    @media (max-width: 820px) {
      .two-col,
      .link-row {
        grid-template-columns: minmax(0, 1fr);
      }

      .badge-row {
        flex-wrap: wrap;
      }

      .source-select {
        flex: 1 1 100%;
      }
    }
  `,
})
export class FooterEditorComponent {
  readonly config = input.required<FooterConfig>();
  readonly configChange = output<FooterConfig>();

  protected readonly draft = signal<FooterConfig>(cloneFooterConfig(DEFAULT_FOOTER_CONFIG));
  protected readonly pickerOpen = signal(false);
  private pickerTarget: string | null = null;
  private lastIncoming: FooterConfig | null = null;

  constructor() {
    effect(() => {
      const incoming = this.config();
      if (incoming === this.lastIncoming) return;

      // Ignore the echo of our own `configChange` output so typing does not
      // reset the local draft (and the caret) on every keystroke.
      const same = JSON.stringify(incoming) === JSON.stringify(this.draft());
      this.lastIncoming = incoming;
      if (!same) this.draft.set(cloneFooterConfig(incoming));
    });
  }

  protected patch(change: Partial<FooterConfig>): void {
    this.commit({ ...this.draft(), ...change });
  }

  protected setFlag(key: 'showBrand' | 'showSocials' | 'showNewsletter', value: boolean): void {
    this.patch({ [key]: value });
  }

  protected setLogo(value: string): void {
    this.patch({ logo: value });
  }

  protected setSectionTitle(index: number, title: string): void {
    this.updateSections((sections) =>
      sections.map((section, position) => (position === index ? { ...section, title } : section)),
    );
  }

  protected setSectionSource(index: number, source: FooterSectionSource): void {
    this.updateSections((sections) =>
      sections.map((section, position) => (position === index ? { ...section, source } : section)),
    );
  }

  protected addSection(): void {
    this.updateSections((sections) => [...sections, { title: 'بخش جدید', source: 'custom', links: [] }]);
  }

  protected removeSection(index: number): void {
    this.updateSections((sections) => sections.filter((_, position) => position !== index));
  }

  protected moveSection(index: number, direction: -1 | 1): void {
    this.updateSections((sections) => moveItem(sections, index, direction));
  }

  protected addLink(sectionIndex: number): void {
    this.updateSections((sections) =>
      sections.map((section, position) =>
        position === sectionIndex
          ? { ...section, links: [...section.links, { label: '', url: '' }] }
          : section,
      ),
    );
  }

  protected setLink(
    sectionIndex: number,
    linkIndex: number,
    patch: { label?: string; url?: string },
  ): void {
    this.updateSections((sections) =>
      sections.map((section, position) =>
        position === sectionIndex
          ? {
              ...section,
              links: section.links.map((link, linkPosition) =>
                linkPosition === linkIndex ? { ...link, ...patch } : link,
              ),
            }
          : section,
      ),
    );
  }

  protected removeLink(sectionIndex: number, linkIndex: number): void {
    this.updateSections((sections) =>
      sections.map((section, position) =>
        position === sectionIndex
          ? { ...section, links: section.links.filter((_, index) => index !== linkIndex) }
          : section,
      ),
    );
  }

  protected moveLink(sectionIndex: number, linkIndex: number, direction: -1 | 1): void {
    this.updateSections((sections) =>
      sections.map((section, position) =>
        position === sectionIndex
          ? { ...section, links: moveItem(section.links, linkIndex, direction) }
          : section,
      ),
    );
  }

  protected addBadge(): void {
    this.patch({ badges: [...this.draft().badges, { image: '', url: '', alt: '' }] });
  }

  protected setBadge(index: number, patch: { image?: string; url?: string; alt?: string }): void {
    this.patch({
      badges: this.draft().badges.map((badge, position) =>
        position === index ? { ...badge, ...patch } : badge,
      ),
    });
  }

  protected removeBadge(index: number): void {
    this.patch({ badges: this.draft().badges.filter((_, position) => position !== index) });
  }

  protected moveBadge(index: number, direction: -1 | 1): void {
    this.patch({ badges: moveItem(this.draft().badges, index, direction) });
  }

  protected openPicker(target: string): void {
    this.pickerTarget = target;
    this.pickerOpen.set(true);
  }

  protected onPicked(items: MediaItem[]): void {
    const item = items[0];
    const target = this.pickerTarget;
    this.pickerOpen.set(false);
    if (!item || !target) return;

    if (target === 'logo') {
      this.setLogo(item.url);
      return;
    }

    if (target.startsWith('badge:')) {
      const index = Number(target.slice('badge:'.length));
      if (!Number.isInteger(index)) return;
      this.setBadge(index, { image: item.url, alt: item.alt || this.draft().badges[index]?.alt || '' });
    }
  }

  protected reset(): void {
    this.commit(cloneFooterConfig(DEFAULT_FOOTER_CONFIG));
  }

  private updateSections(update: (sections: FooterConfig['sections']) => FooterConfig['sections']): void {
    this.patch({ sections: update(this.draft().sections) });
  }

  private commit(config: FooterConfig): void {
    this.draft.set(config);
    this.configChange.emit(config);
  }
}

/** Moves an item by one position, returning the same array at the edges. */
const moveItem = <T>(items: T[], index: number, direction: -1 | 1): T[] => {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};
