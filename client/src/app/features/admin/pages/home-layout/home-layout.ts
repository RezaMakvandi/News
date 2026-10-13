import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { SettingsService } from '../../../../core/services/settings.service';
import { CategoryService, TagService } from '../../../../core/services/taxonomy.service';
import { ShopService } from '../../../../core/services/shop.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import {
  HOME_SECTION_DEFS,
  HOME_LAYOUT_DEFAULT,
  HOME_WIDTH_OPTIONS,
  newHomeSection,
  normalizeHomeLayout,
  sectionMeta,
  sectionWidth,
  type HomeSection,
  type HomeSectionCols,
  type HomeSectionType,
} from '../../../../core/models/home-layout.model';
import type { Category, Tag } from '../../../../core/models/taxonomy.model';
import type { ProductCategory } from '../../../../core/models/product.model';

@Component({
  selector: 'app-home-layout-page',
  imports: [
    FormsModule,
    RouterLink,
    CdkDropList,
    CdkDrag,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    FaNumberPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>چیدمان صفحه اصلی</h1>
        <p class="text-sm text-muted">
          با کشیدن و رها کردن، ترتیب و نمایش بخشهای صفحه اصلی را شخصیسازی کنید؛ حتی میتوانید کالاهای
          فروشگاه را در صفحه اصلی قرار دهید.
        </p>
      </div>
      <div class="row">
        <a class="btn btn-ghost" routerLink="/" target="_blank">
          <app-icon name="globe" [size]="18" />
          پیشنمایش سایت
        </a>
        <button type="button" class="btn btn-ghost" (click)="reset()" [disabled]="saving()">
          <app-icon name="refresh" [size]="18" />
          چیدمان پیشفرض
        </button>
        <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner spinner-sm"></span>
          } @else {
            <app-icon name="check" [size]="18" />
          }
          ذخیره چیدمان
        </button>
      </div>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری چیدمان..." />
    } @else {
      <div class="layout-editor">
        <div class="layout-canvas card card-pad">
          <div class="canvas-head">
            <span class="text-sm text-muted">
              بخشهای فعال صفحه اصلی — {{ sections().length | faNumber }} بخش
            </span>
            <span class="text-xs text-faint">برای جابهجایی، دستگیره هر بخش را بکشید</span>
          </div>

          @if (!sections().length) {
            <app-empty-state
              icon="grid"
              title="هنوز بخشی اضافه نشده است"
              description="از فهرست کنار، بخشهای مورد نظر را به صفحه اصلی اضافه کنید."
            />
          } @else {
            <div cdkDropList class="section-list" (cdkDropListDropped)="drop($event)">
              @for (section of sections(); track section.id; let i = $index) {
                <div class="section-card" cdkDrag [class.is-disabled]="section.enabled === false">
                  <div class="section-drag" cdkDragHandle title="جابهجایی">
                    <app-icon name="menu" [size]="16" />
                  </div>

                  <span class="section-icon">
                    <app-icon [name]="meta(section).icon" [size]="18" />
                  </span>

                  <div class="section-main">
                    <div class="section-title-row">
                      <strong>{{ label(section) }}</strong>
                      <span class="section-type">{{ meta(section).label }}</span>
                      <span class="section-width" [class.is-full]="sectionWidth(section) === 12">
                        {{ widthLabel(section) }}
                      </span>
                    </div>
                    <p class="section-desc">{{ meta(section).description }}</p>

                    @if (openId() === section.id) {
                      <div class="section-form">
                        <div class="field">
                          <label class="label">عرض بخش (برای چیدمان کنار هم)</label>
                          <div class="seg seg-wide">
                            @for (opt of widthOptions; track opt.value) {
                              <button
                                type="button"
                                class="seg-btn wide"
                                [class.is-active]="sectionWidth(section) === opt.value"
                                (click)="setWidth(section, opt.value)"
                              >
                                {{ opt.label }}
                              </button>
                            }
                          </div>
                          <p class="field-hint">
                            بخش‌های متوالی که مجموع عرض‌شان از ۱۲ کمتر باشد، در یک ردیف و کنار هم
                            نمایش داده می‌شوند (مثال: ۸ + ۴ = ستون اصلی و نوار کناری).
                          </p>
                        </div>

                        @if (hasTitle(section.type)) {
                          <div class="field">
                            <label class="label">عنوان بخش</label>
                            <input
                              class="input"
                              [ngModel]="section.title"
                              (ngModelChange)="setProp(section, 'title', $event)"
                              [ngModelOptions]="{ standalone: true }"
                            />
                          </div>
                        }

                        @if (hasSubtitle(section.type)) {
                          <div class="field">
                            <label class="label">توضیح</label>
                            <textarea
                              class="textarea"
                              rows="2"
                              [ngModel]="section.subtitle"
                              (ngModelChange)="setProp(section, 'subtitle', $event)"
                              [ngModelOptions]="{ standalone: true }"
                            ></textarea>
                          </div>
                        }

                        @if (section.type === 'html') {
                          <div class="field">
                            <label class="label">کد HTML</label>
                            <textarea
                              class="textarea mono"
                              rows="5"
                              dir="ltr"
                              placeholder="<div>...</div>"
                              [ngModel]="section.html"
                              (ngModelChange)="setProp(section, 'html', $event)"
                              [ngModelOptions]="{ standalone: true }"
                            ></textarea>
                          </div>
                        }

                        @if (hasLimit(section.type)) {
                          <div class="field">
                            <label class="label">تعداد آیتمها</label>
                            <input
                              class="input"
                              type="number"
                              min="1"
                              max="24"
                              [ngModel]="section.limit"
                              (ngModelChange)="setProp(section, 'limit', $event)"
                              [ngModelOptions]="{ standalone: true }"
                            />
                          </div>
                        }

                        @if (hasColumns(section.type)) {
                          <div class="field">
                            <label class="label">تعداد ستونها (دسکتاپ)</label>
                            <div class="seg">
                              @for (col of columns; track col) {
                                <button
                                  type="button"
                                  class="seg-btn"
                                  [class.is-active]="(section.columns ?? 4) === col"
                                  (click)="setColumns(section, col)"
                                >
                                  {{ col }}
                                </button>
                              }
                            </div>
                          </div>
                        }

                        @if (section.type === 'category_articles') {
                          <div class="field">
                            <label class="label">دستهبندی اخبار</label>
                            <select
                              class="input"
                              [ngModel]="section.categorySlug"
                              (ngModelChange)="setProp(section, 'categorySlug', $event)"
                              [ngModelOptions]="{ standalone: true }"
                            >
                              <option value="">— انتخاب کنید —</option>
                              @for (category of categories(); track category._id) {
                                <option [value]="category.slug">{{ category.name }}</option>
                              }
                            </select>
                          </div>
                        }

                        @if (section.type === 'tag_articles') {
                          <div class="field">
                            <label class="label">برچسب</label>
                            <select
                              class="input"
                              [ngModel]="section.tagSlug"
                              (ngModelChange)="setProp(section, 'tagSlug', $event)"
                              [ngModelOptions]="{ standalone: true }"
                            >
                              <option value="">— انتخاب کنید —</option>
                              @for (tag of tags(); track tag._id) {
                                <option [value]="tag.slug">{{ tag.name }}</option>
                              }
                            </select>
                          </div>
                        }

                        @if (section.type === 'products') {
                          <div class="form-grid">
                            <div class="field">
                              <label class="label">ترتیب نمایش</label>
                              <select
                                class="input"
                                [ngModel]="section.sort"
                                (ngModelChange)="setProp(section, 'sort', $event)"
                                [ngModelOptions]="{ standalone: true }"
                              >
                                @for (option of productSorts; track option.value) {
                                  <option [value]="option.value">{{ option.label }}</option>
                                }
                              </select>
                            </div>
                            <div class="field">
                              <label class="label">دستهبندی محصول (اختیاری)</label>
                              <select
                                class="input"
                                [ngModel]="section.productCategory"
                                (ngModelChange)="setProp(section, 'productCategory', $event)"
                                [ngModelOptions]="{ standalone: true }"
                              >
                                <option value="">همه دستهها</option>
                                @for (category of productCategories(); track category._id) {
                                  <option [value]="category.slug">{{ category.name }}</option>
                                }
                              </select>
                            </div>
                          </div>
                          <div class="row">
                            <label class="switch">
                              <input
                                type="checkbox"
                                [ngModel]="section.onSale"
                                (ngModelChange)="setProp(section, 'onSale', $event)"
                                [ngModelOptions]="{ standalone: true }"
                              />
                              <span class="track"></span>
                            </label>
                            <span class="text-sm">فقط کالاهای تخفیفدار</span>
                          </div>
                          <div class="row">
                            <label class="switch">
                              <input
                                type="checkbox"
                                [ngModel]="section.featured"
                                (ngModelChange)="setProp(section, 'featured', $event)"
                                [ngModelOptions]="{ standalone: true }"
                              />
                              <span class="track"></span>
                            </label>
                            <span class="text-sm">فقط کالاهای پیشنهاد ویژه</span>
                          </div>
                        }

                        @if (hasCta(section.type)) {
                          <div class="row">
                            <label class="switch">
                              <input
                                type="checkbox"
                                [ngModel]="section.showCta"
                                (ngModelChange)="setProp(section, 'showCta', $event)"
                                [ngModelOptions]="{ standalone: true }"
                              />
                              <span class="track"></span>
                            </label>
                            <span class="text-sm">نمایش پیوند «مشاهده همه»</span>
                          </div>
                          @if (section.showCta) {
                            <div class="form-grid">
                              <div class="field">
                                <label class="label">متن پیوند</label>
                                <input
                                  class="input"
                                  [ngModel]="section.ctaLabel"
                                  (ngModelChange)="setProp(section, 'ctaLabel', $event)"
                                  [ngModelOptions]="{ standalone: true }"
                                />
                              </div>
                              <div class="field">
                                <label class="label">آدرس پیوند</label>
                                <input
                                  class="input"
                                  dir="ltr"
                                  [ngModel]="section.ctaHref"
                                  (ngModelChange)="setProp(section, 'ctaHref', $event)"
                                  [ngModelOptions]="{ standalone: true }"
                                />
                              </div>
                            </div>
                          }
                        }
                      </div>
                    }
                  </div>

                  <div class="section-actions">
                    <label class="switch" title="نمایش/پنهان">
                      <input
                        type="checkbox"
                        [ngModel]="section.enabled"
                        (ngModelChange)="setProp(section, 'enabled', $event)"
                        [ngModelOptions]="{ standalone: true }"
                      />
                      <span class="track"></span>
                    </label>
                    @if (section.type !== 'hero') {
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon btn-sm"
                        (click)="toggleOpen(section.id)"
                        [attr.aria-label]="openId() === section.id ? 'بستن تنظیمات' : 'تنظیمات'"
                      >
                        <app-icon
                          [name]="openId() === section.id ? 'chevron-down' : 'settings'"
                          [size]="16"
                        />
                      </button>
                    }
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon btn-sm"
                      (click)="duplicate(i)"
                      aria-label="کپی"
                    >
                      <app-icon name="copy" [size]="16" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon btn-sm danger"
                      (click)="remove(i)"
                      aria-label="حذف"
                    >
                      <app-icon name="trash" [size]="16" />
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <aside class="layout-library">
          <div class="card card-pad">
            <h3 class="card-title">افزودن بخش</h3>
            <p class="text-xs text-muted">برای افزودن به انتهای صفحه، روی هر مورد کلیک کنید.</p>
            <div class="lib-list">
              @for (def of defs; track def.type) {
                <button type="button" class="lib-item" (click)="add(def.type)">
                  <span class="lib-icon"><app-icon [name]="def.icon" [size]="18" /></span>
                  <span class="lib-text">
                    <strong>{{ def.label }}</strong>
                    <small>{{ def.description }}</small>
                  </span>
                  <app-icon name="plus-circle" [size]="18" />
                </button>
              }
            </div>
          </div>
        </aside>
      </div>
    }
  `,
  styles: `
    .layout-editor {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: var(--space-5);
      align-items: start;
    }

    .canvas-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }

    .section-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      min-height: 60px;
    }

    .section-card {
      display: grid;
      grid-template-columns: 28px 40px minmax(0, 1fr) auto;
      align-items: start;
      gap: var(--space-3);
      padding: var(--space-3);
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-xs);
    }

    .section-card.is-disabled {
      opacity: 0.6;
    }

    .section-drag {
      display: grid;
      place-items: center;
      width: 28px;
      height: 40px;
      color: var(--text-faint);
      cursor: grab;
      border-radius: var(--radius-xs);
      border: 1px dashed var(--border);
    }

    .section-drag:active {
      cursor: grabbing;
    }

    .section-icon {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      background: var(--accent-soft);
      color: var(--accent);
    }

    .section-title-row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    .section-type {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 1px 8px;
      border-radius: var(--radius-full);
      background: var(--surface-2);
      color: var(--text-muted);
    }

    .section-width {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 1px 8px;
      border-radius: var(--radius-full);
      background: var(--accent-soft);
      color: var(--accent);
    }

    .section-width.is-full {
      background: var(--surface-2);
      color: var(--text-muted);
    }

    .section-desc {
      margin: 2px 0 0;
      font-size: 0.78rem;
      color: var(--text-faint);
    }

    .section-form {
      display: grid;
      gap: var(--space-3);
      margin-top: var(--space-3);
      padding-top: var(--space-3);
      border-top: 1px dashed var(--border);
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-3);
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .section-actions .danger:hover {
      color: var(--danger);
      background: var(--danger-soft);
    }

    .seg {
      display: inline-flex;
      gap: 4px;
    }

    .seg-wide {
      flex-wrap: wrap;
    }

    .seg-btn {
      width: 36px;
      height: 34px;
      border: 1px solid var(--border);
      border-radius: var(--radius-xs);
      background: var(--surface-2);
      color: var(--text-muted);
      font-weight: 700;
      cursor: pointer;
    }

    .seg-btn.is-active {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--accent-contrast);
    }

    .seg-btn.wide {
      width: auto;
      height: 32px;
      padding: 0 var(--space-3);
      font-size: 0.8rem;
    }

    .field-hint {
      margin: 6px 0 0;
      font-size: 0.76rem;
      line-height: 1.7;
      color: var(--text-faint);
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.82rem;
    }

    .layout-library {
      position: sticky;
      top: var(--space-4);
    }

    .lib-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin-top: var(--space-3);
    }

    .lib-item {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--surface-border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      text-align: start;
      cursor: pointer;
      transition:
        border-color var(--transition-fast),
        background-color var(--transition-fast);
    }

    .lib-item:hover {
      border-color: var(--accent);
      background: var(--accent-softer);
    }

    .lib-icon {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: var(--radius-xs);
      background: var(--accent-soft);
      color: var(--accent);
    }

    .lib-text {
      display: grid;
      min-width: 0;
    }

    .lib-text strong {
      font-size: 0.85rem;
    }

    .lib-text small {
      font-size: 0.72rem;
      color: var(--text-faint);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 1000px) {
      .layout-editor {
        grid-template-columns: minmax(0, 1fr);
      }

      .layout-library {
        position: static;
      }
    }
  `,
})
export class HomeLayoutPage {
  private readonly settingsService = inject(SettingsService);
  private readonly categoryService = inject(CategoryService);
  private readonly tagService = inject(TagService);
  private readonly shop = inject(ShopService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly defs = HOME_SECTION_DEFS;
  protected readonly columns: HomeSectionCols[] = [1, 2, 3, 4];
  protected readonly widthOptions = HOME_WIDTH_OPTIONS;
  protected readonly productSorts = [
    { value: 'newest', label: 'جدیدترین' },
    { value: 'popular', label: 'پرفروشترین' },
    { value: 'price-asc', label: 'ارزانترین' },
    { value: 'price-desc', label: 'گرانترین' },
    { value: 'rating', label: 'بهترین امتیاز' },
  ];

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly sections = signal<HomeSection[]>([]);
  protected readonly openId = signal<string | null>(null);

  protected readonly categories = signal<Category[]>([]);
  protected readonly tags = signal<Tag[]>([]);
  protected readonly productCategories = signal<ProductCategory[]>([]);

  constructor() {
    this.seo.set({ title: 'چیدمان صفحه اصلی | پنل مدیریت' });

    this.settingsService.load().subscribe({
      next: () => {
        const configured = normalizeHomeLayout(this.settingsService.settings()['homeLayout']);
        this.sections.set(configured.length ? configured : structuredClone(HOME_LAYOUT_DEFAULT));
        this.loading.set(false);
      },
      error: () => {
        this.sections.set(structuredClone(HOME_LAYOUT_DEFAULT));
        this.loading.set(false);
      },
    });

    this.categoryService.list().subscribe({
      next: (items) => this.categories.set(items ?? []),
      error: () => this.categories.set([]),
    });
    this.tagService.list({ limit: 100 }).subscribe({
      next: (result) => this.tags.set(result.items ?? []),
      error: () => this.tags.set([]),
    });
    this.shop.categories().subscribe({
      next: (items) => this.productCategories.set(items ?? []),
      error: () => this.productCategories.set([]),
    });
  }

  protected meta(section: HomeSection) {
    return sectionMeta(section.type);
  }

  protected label(section: HomeSection): string {
    return section.title?.trim() || this.meta(section).label;
  }

  /** Immutably patches one field of a section so signals notify the view. */
  protected setProp<K extends keyof HomeSection>(
    section: HomeSection,
    key: K,
    value: HomeSection[K],
  ): void {
    this.sections.update((list) =>
      list.map((item) => (item.id === section.id ? { ...item, [key]: value } : item)),
    );
  }

  protected setColumns(section: HomeSection, columns: HomeSectionCols): void {
    this.setProp(section, 'columns', columns);
  }

  protected sectionWidth(section: HomeSection): number {
    return sectionWidth(section);
  }

  protected setWidth(section: HomeSection, width: number): void {
    this.setProp(section, 'width', width);
  }

  protected widthLabel(section: HomeSection): string {
    const width = sectionWidth(section);
    return this.widthOptions.find((opt) => opt.value === width)?.label ?? `${width}/۱۲`;
  }

  protected hasTitle(type: HomeSectionType): boolean {
    return type !== 'hero' && type !== 'html';
  }

  protected hasSubtitle(type: HomeSectionType): boolean {
    return type === 'shop_banner' || type === 'newsletter';
  }

  protected hasLimit(type: HomeSectionType): boolean {
    return !['hero', 'shop_banner', 'newsletter', 'html'].includes(type);
  }

  protected hasColumns(type: HomeSectionType): boolean {
    return [
      'featured_articles',
      'latest_articles',
      'category_articles',
      'tag_articles',
      'popular_articles',
      'products',
      'product_categories',
    ].includes(type);
  }

  protected hasCta(type: HomeSectionType): boolean {
    return !['hero', 'html', 'breaking_articles', 'tags_cloud'].includes(type);
  }

  protected add(type: HomeSectionType): void {
    const section = newHomeSection(type);
    this.sections.update((list) => [...list, section]);
    this.openId.set(section.id);
  }

  protected duplicate(index: number): void {
    this.sections.update((list) => {
      const copy = structuredClone(list[index]);
      copy.id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const next = [...list];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  protected remove(index: number): void {
    this.sections.update((list) => list.filter((_, i) => i !== index));
  }

  protected toggleOpen(id: string): void {
    this.openId.update((current) => (current === id ? null : id));
  }

  protected drop(event: CdkDragDrop<HomeSection[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.sections.update((list) => {
      const next = [...list];
      moveItemInArray(next, event.previousIndex, event.currentIndex);
      return next;
    });
  }

  protected reset(): void {
    this.sections.set(structuredClone(HOME_LAYOUT_DEFAULT));
    this.openId.set(null);
    this.toast.info('چیدمان پیشفرض بازگردانده شد؛ برای اعمال، ذخیره کنید');
  }

  protected save(): void {
    this.saving.set(true);
    this.settingsService.saveHomeLayout(this.sections()).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('چیدمان صفحه اصلی ذخیره شد');
        this.settingsService.load(true).subscribe();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.error(error.message || 'ذخیره چیدمان انجام نشد');
      },
    });
  }
}
