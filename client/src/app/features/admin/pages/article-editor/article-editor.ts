import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { ArticleService } from '../../../../core/services/article.service';
import { CategoryService, TagService } from '../../../../core/services/taxonomy.service';
import { MediaService } from '../../../../core/services/media.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { Article, ArticleImage, ArticlePayload, ArticleStatus, ArticleType } from '../../../../core/models/article.model';
import type { Category, Tag } from '../../../../core/models/taxonomy.model';
import type { MediaItem } from '../../../../core/models/media.model';
import { idOf } from '../../../../core/utils/relation';
import { toDateTimeLocal } from '../../../../core/utils/format';
import { ARTICLE_TYPE_LABELS } from '../../../../core/models/article.model';

@Component({
  selector: 'app-article-editor-page',
  imports: [FormsModule, IconComponent, SpinnerComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>{{ isNew() ? 'خبر جدید' : 'ویرایش خبر' }}</h1>
        <p class="text-sm text-muted">{{ isNew() ? 'مشخصات خبر را وارد و منتشر کنید.' : 'ویرایش و به‌روزرسانی خبر فعلی.' }}</p>
      </div>
      <div class="row">
        <button type="button" class="btn btn-ghost" (click)="cancel()">انصراف</button>
        <button type="button" class="btn btn-outline" (click)="save('draft')" [disabled]="saving()">
          <app-icon name="edit" [size]="16" />
          ذخیره پیش‌نویس
        </button>
        <button type="button" class="btn btn-primary" (click)="save('published')" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner spinner-sm"></span>
          } @else {
            <app-icon name="send" [size]="16" />
          }
          {{ isNew() ? 'انتشار خبر' : 'به‌روزرسانی' }}
        </button>
      </div>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری خبر…" />
    } @else {
      <div class="editor-layout">
        <div class="stack-lg">
          <div class="card card-pad">
            <div class="field">
              <label class="label" for="title">عنوان خبر <span class="req">*</span></label>
              <input
                id="title"
                class="input"
                name="title"
                [class.is-invalid]="errors()['title']"
                [(ngModel)]="form.title"
                placeholder="عنوان کامل خبر را بنویسید"
              />
              @if (errors()['title']) {
                <span class="error-text">{{ errors()['title'] }}</span>
              }
            </div>

            <div class="field">
              <label class="label" for="summary">خلاصه (لید)</label>
              <textarea
                id="summary"
                class="textarea"
                name="summary"
                rows="3"
                [(ngModel)]="form.summary"
                placeholder="خلاصه کوتاهی که در کارت‌ها نمایش داده می‌شود"
              ></textarea>
            </div>

            <div class="field">
              <label class="label" for="content">متن خبر <span class="req">*</span></label>
              <textarea
                id="content"
                class="textarea editor-area"
                name="content"
                rows="18"
                dir="auto"
                [class.is-invalid]="errors()['content']"
                [(ngModel)]="form.content"
                placeholder="متن HTML خبر را اینجا بنویسید"
              ></textarea>
              @if (errors()['content']) {
                <span class="error-text">{{ errors()['content'] }}</span>
              }
            </div>
          </div>

          <div class="card card-pad">
            <h3 class="card-title">تصویر و گالری</h3>

            <div class="field">
              <label class="label">تصویر شاخص</label>
              <div class="row">
                @if (form.cover) {
                  <img class="cover-preview" [src]="form.cover" [alt]="form.coverAlt || form.title" />
                }
                <input
                  class="input grow"
                  name="cover"
                  dir="ltr"
                  placeholder="/uploads/…"
                  [(ngModel)]="form.cover"
                />
                <button type="button" class="btn btn-ghost btn-sm" (click)="pickMedia('cover')">
                  <app-icon name="image" [size]="16" />
                  انتخاب از کتابخانه
                </button>
              </div>
            </div>

            <div class="field">
              <label class="label">توضیح تصویر (متن جایگزین)</label>
              <input
                class="input"
                name="coverAlt"
                [(ngModel)]="form.coverAlt"
                placeholder="توضیحی برای تصویر شاخص"
              />
            </div>

            <div class="field">
              <label class="label">گالری تصاویر</label>
              @for (image of form.gallery; track $index) {
                <div class="row" style="margin-bottom: var(--space-2)">
                  <input class="input grow" dir="ltr" [ngModel]="image.url" (ngModelChange)="updateGallery($index, { url: $event })" placeholder="نشانی تصویر" />
                  <input class="input" [ngModel]="image.alt ?? ''" (ngModelChange)="updateGallery($index, { alt: $event })" placeholder="متن جایگزین" />
                  <button type="button" class="btn btn-ghost btn-icon btn-sm is-danger" (click)="removeGallery($index)" aria-label="حذف">
                    <app-icon name="trash" [size]="16" />
                  </button>
                </div>
              }
              <button type="button" class="btn btn-ghost btn-sm" (click)="addGallery()">
                <app-icon name="plus-circle" [size]="16" />
                افزودن تصویر
              </button>
            </div>
          </div>

          <div class="card card-pad">
            <h3 class="card-title">سئو</h3>

            <div class="field">
              <label class="label">عنوان سئو</label>
              <input class="input" [(ngModel)]="form.seo.title" name="seoTitle" />
            </div>
            <div class="field">
              <label class="label">توضیحات سئو</label>
              <textarea class="textarea" rows="3" [(ngModel)]="form.seo.description" name="seoDescription"></textarea>
            </div>
            <div class="field">
              <label class="label">کلیدواژه‌ها (با ، جدا کنید)</label>
              <input class="input" dir="ltr" [(ngModel)]="seoKeywords" name="seoKeywords" />
            </div>
          </div>
        </div>

        <aside class="stack-lg">
          <div class="card card-pad">
            <h3 class="card-title">انتشار</h3>

            <div class="field">
              <label class="label">دسته‌بندی <span class="req">*</span></label>
              <select class="select" [(ngModel)]="form.category" name="category" [class.is-invalid]="errors()['category']">
                <option value="">انتخاب کنید</option>
                @for (category of categories(); track category._id) {
                  <option [value]="category._id">{{ category.name }}</option>
                }
              </select>
              @if (errors()['category']) {
                <span class="error-text">{{ errors()['category'] }}</span>
              }
            </div>

            <div class="field">
              <label class="label">نوع مطلب</label>
              <select class="select" [(ngModel)]="form.type" name="type">
                @for (type of types(); track type.value) {
                  <option [value]="type.value">{{ type.label }}</option>
                }
              </select>
            </div>

            <div class="field">
              <label class="label">برچسب‌ها</label>
              <div class="chip-list">
                @for (tag of availableTags(); track tag._id) {
                  <button
                    type="button"
                    class="chip"
                    [class.is-active]="form.tags.includes(tag.name)"
                    (click)="toggleTag(tag.name)"
                  >
                    {{ tag.name }}
                  </button>
                }
              </div>
            </div>

            <div class="field">
              <label class="switch">
                <input type="checkbox" [(ngModel)]="form.isFeatured" name="isFeatured" />
                <span class="track"></span>
              </label>
              <span class="text-sm">نمایش به‌عنوان خبر ویژه</span>
            </div>

            <div class="field">
              <label class="switch">
                <input type="checkbox" [(ngModel)]="form.isBreaking" name="isBreaking" />
                <span class="track"></span>
              </label>
              <span class="text-sm">نمایش در نوار فوری</span>
            </div>

            <div class="field">
              <label class="switch">
                <input type="checkbox" [(ngModel)]="form.isPinned" name="isPinned" />
                <span class="track"></span>
              </label>
              <span class="text-sm">سنجاق کردن در بالای لیست</span>
            </div>

            <div class="field">
              <label class="switch">
                <input type="checkbox" [(ngModel)]="form.allowComments" name="allowComments" />
                <span class="track"></span>
              </label>
              <span class="text-sm">فعال بودن نظرات</span>
            </div>

            <div class="field">
              <label class="label">زمان انتشار (اختیاری)</label>
              <input class="input" type="datetime-local" [(ngModel)]="scheduledAt" name="scheduledAt" />
            </div>

            <div class="field">
              <label class="label">منبع خبر</label>
              <input class="input" [(ngModel)]="form.source.name" name="sourceName" placeholder="نام منبع" />
            </div>
            <div class="field">
              <input class="input" dir="ltr" [(ngModel)]="form.source.url" name="sourceUrl" placeholder="https://…" />
            </div>
          </div>

          <div class="card card-pad">
            <h3 class="card-title">اطلاعات تکمیلی</h3>
            <div class="stat-list">
              <span class="stat">
                <app-icon name="clock" [size]="15" />
                {{ form.readingTime }} دقیقه مطالعه
              </span>
              <span class="stat">
                <app-icon name="eye" [size]="15" />
                {{ form.views }} بازدید
              </span>
              <span class="stat">
                <app-icon name="heart" [size]="15" />
                {{ form.likes }} پسند
              </span>
            </div>
          </div>
        </aside>
      </div>
    }

    @if (mediaPickerOpen()) {
      <app-modal title="انتخاب تصویر" [open]="true" size="lg" (closed)="mediaPickerOpen.set(false)">
        <div class="media-grid modal-media-grid">
          @for (media of mediaItems(); track media._id) {
            <button type="button" class="media-item" (click)="selectMedia(media)">
              <img [src]="media.url" [alt]="media.alt || media.originalName" loading="lazy" />
              <span class="media-name clamp-1">{{ media.originalName }}</span>
            </button>
          }
        </div>
      </app-modal>
    }
  `,
  styles: `
    .editor-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: var(--space-5);
      align-items: start;
    }

    .stack-lg > * + * {
      margin-top: var(--space-4);
    }

    .editor-area {
      min-height: 360px;
      font-family: 'Vazirmatn Variable', monospace;
      direction: ltr;
      text-align: left;
    }

    .cover-preview {
      width: 96px;
      height: 54px;
      object-fit: cover;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }

    .chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      max-height: 180px;
      overflow-y: auto;
      padding: var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-inset);
    }

    .media-grid.modal-media-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .media-item {
      border: 2px solid transparent;
      border-radius: var(--radius-sm);
      padding: 4px;
      background: transparent;
      cursor: pointer;
      display: grid;
      gap: 4px;
      text-align: center;
      transition: border-color var(--transition-fast);
    }

    .media-item:hover,
    .media-item:focus-visible {
      border-color: var(--accent);
    }

    .media-item img {
      width: 100%;
      height: 90px;
      object-fit: cover;
      border-radius: var(--radius-xs);
    }

    .media-name {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    @media (max-width: 1024px) {
      .editor-layout {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ArticleEditorPage {
  /** Route parameter — empty string when creating a new article. */
  readonly id = input('');

  private readonly articleService = inject(ArticleService);
  private readonly categoryService = inject(CategoryService);
  private readonly tagService = inject(TagService);
  private readonly mediaService = inject(MediaService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly mediaPickerOpen = signal(false);
  protected readonly categories = signal<Category[]>([]);
  protected readonly availableTags = signal<Tag[]>([]);
  protected readonly mediaItems = signal<MediaItem[]>([]);

  protected readonly isNew = computed(() => !this.id());
  protected readonly errors = signal<Record<string, string>>({});
  protected scheduledAt = '';
  protected seoKeywords = '';

  protected readonly form = {
    title: '',
    summary: '',
    content: '',
    cover: '',
    coverAlt: '',
    gallery: [] as ArticleImage[],
    type: 'news' as ArticleType,
    category: '',
    tags: [] as string[],
    isFeatured: false,
    isBreaking: false,
    isPinned: false,
    allowComments: true,
    seo: { title: '', description: '' },
    source: { name: '', url: '' },
    readingTime: 0,
    views: 0,
    likes: 0,
  };

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) {
        this.seo.set({ title: 'ویرایش خبر | پنل مدیریت' });
        this.load(id);
      } else {
        this.seo.set({ title: 'خبر جدید | پنل مدیریت' });
      }
    });

    this.categoryService.list(true).subscribe({ next: (items) => this.categories.set(items) });
    this.tagService.list({ limit: 100, sort: 'popular' }).subscribe({ next: (list) => this.availableTags.set(list.items ?? []) });
  }

  protected types(): { value: ArticleType; label: string }[] {
    return (Object.keys(ARTICLE_TYPE_LABELS) as ArticleType[]).map((value) => ({
      value,
      label: ARTICLE_TYPE_LABELS[value],
    }));
  }

  protected toggleTag(name: string): void {
    const index = this.form.tags.indexOf(name);
    if (index >= 0) this.form.tags.splice(index, 1);
    else this.form.tags.push(name);
  }

  protected addGallery(): void {
    this.form.gallery.push({ url: '', alt: '', caption: '' });
  }

  protected updateGallery(index: number, patch: Partial<ArticleImage>): void {
    this.form.gallery[index] = { ...this.form.gallery[index], ...patch };
  }

  protected removeGallery(index: number): void {
    this.form.gallery.splice(index, 1);
  }

  protected pickMedia(target: 'cover' | 'gallery'): void {
    void target;
    this.mediaPickerOpen.set(true);
    if (!this.mediaItems().length) {
      this.mediaService.list({ limit: 60 }).subscribe({
        next: (result) => this.mediaItems.set(result.items),
      });
    }
  }

  protected selectMedia(media: MediaItem): void {
    if (!this.form.cover) {
      this.form.cover = media.url;
      this.form.coverAlt = media.alt ?? this.form.title;
    } else {
      this.form.gallery.push({ url: media.url, alt: media.alt ?? '' });
    }
    this.mediaPickerOpen.set(false);
  }

  protected cancel(): void {
    void this.router.navigateByUrl('/admin/articles');
  }

  protected save(status: ArticleStatus): void {
    if (!this.validate()) return;

    this.saving.set(true);
    const payload = this.buildPayload(status);

    const request = this.isNew()
      ? this.articleService.create(payload)
      : this.articleService.update(this.id(), payload);

    request.subscribe({
      next: (article) => {
        this.saving.set(false);
        this.toast.success(this.isNew() ? 'خبر با موفقیت منتشر شد' : 'تغییرات ذخیره شد');
        void this.router.navigate(['/admin/articles']);
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.error(error.message || 'ذخیره انجام نشد');
      },
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.articleService.adminGet(id).subscribe({
      next: (article) => {
        this.loading.set(false);
        this.patchForm(article);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('خبر مورد نظر یافت نشد');
        void this.router.navigateByUrl('/admin/articles');
      },
    });
  }

  private patchForm(article: Article): void {
    this.form.title = article.title;
    this.form.summary = article.summary ?? '';
    this.form.content = article.content;
    this.form.cover = article.cover ?? '';
    this.form.coverAlt = article.coverAlt ?? '';
    this.form.gallery = article.gallery ?? [];
    this.form.type = article.type;
    this.form.category = idOf(article.category);
    this.form.tags = article.tags.map((tag) => (typeof tag === 'string' ? tag : tag.name));
    this.form.isFeatured = article.isFeatured;
    this.form.isBreaking = article.isBreaking;
    this.form.isPinned = article.isPinned;
    this.form.allowComments = article.allowComments;
    this.form.seo = {
      title: article.seo?.title ?? '',
      description: article.seo?.description ?? '',
    };
    this.form.source = {
      name: article.source?.name ?? '',
      url: article.source?.url ?? '',
    };
    this.form.readingTime = article.readingTime;
    this.form.views = article.views;
    this.form.likes = article.likes;
    this.seoKeywords = (article.seo?.keywords ?? []).join('، ');
    this.scheduledAt = toDateTimeLocal(article.scheduledAt);
  }

  private buildPayload(status: ArticleStatus): ArticlePayload {
    return {
      title: this.form.title.trim(),
      summary: this.form.summary.trim(),
      content: this.form.content,
      cover: this.form.cover || undefined,
      coverAlt: this.form.coverAlt || undefined,
      gallery: this.form.gallery.filter((image) => image.url.trim()),
      type: this.form.type,
      category: this.form.category,
      tags: this.form.tags,
      isFeatured: this.form.isFeatured,
      isBreaking: this.form.isBreaking,
      isPinned: this.form.isPinned,
      allowComments: this.form.allowComments,
      seo: {
        title: this.form.seo.title || undefined,
        description: this.form.seo.description || undefined,
        keywords: this.seoKeywords
          .split(/[,،]/)
          .map((item) => item.trim())
          .filter(Boolean),
      },
      source: {
        name: this.form.source.name || undefined,
        url: this.form.source.url || undefined,
      },
      status,
      scheduledAt: this.scheduledAt || null,
    };
  }

  private validate(): boolean {
    const errors: Record<string, string> = {};
    if (this.form.title.trim().length < 3) errors['title'] = 'عنوان باید حداقل ۳ کاراکتر باشد';
    if (this.form.content.trim().length < 10) errors['content'] = 'متن خبر باید حداقل ۱۰ کاراکتر باشد';
    if (!this.form.category) errors['category'] = 'انتخاب دسته‌بندی الزامی است';
    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }
}