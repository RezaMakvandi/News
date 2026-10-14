import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { concat, type Observable } from 'rxjs';
import { ChunkedUploadService } from '../../../../core/services/chunked-upload.service';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { MediaService } from '../../../../core/services/media.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { MediaItem } from '../../../../core/models/media.model';
import { formatFileSize } from '../../../../core/models/media.model';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';

/** Files above this size no longer fit one multipart request (server cap is 12 MB). */
const MAX_MULTIPART_SIZE = 10 * 1024 * 1024;

const isVideoFile = (file: File): boolean =>
  file.type.startsWith('video/') || /\.(mp4|webm|ogv|ogg|mov|mkv|m4v)$/i.test(file.name);

@Component({
  selector: 'app-media-page',
  imports: [
    FormsModule,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    ConfirmDialogComponent,
    ModalComponent,
    FaNumberPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>کتابخانه رسانه</h1>
        <p class="text-sm text-muted">مدیریت تصاویر و فایل‌های آپلود شده.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="uploadInput.click()">
        <app-icon name="upload" [size]="18" />
        آپلود فایل
      </button>
    </div>

    <input
      #uploadInput
      type="file"
      multiple
      hidden
      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif,application/pdf,video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
      (change)="onFilesSelected($event)"
    />

    <div class="filter-bar">
      <div class="row wrap">
        <select class="select" [ngModel]="folder()" (ngModelChange)="setFolder($event)">
          <option value="">همه پوشه‌ها</option>
          @for (item of folders(); track item) {
            <option [value]="item">{{ item }}</option>
          }
        </select>

        <select class="select" [ngModel]="type()" (ngModelChange)="setType($event)">
          <option value="">همه نوع‌ها</option>
          <option value="image">تصویر</option>
          <option value="video">ویدیو</option>
        </select>
      </div>

      <div class="input-search">
        <app-icon name="search" [size]="16" />
        <input
          class="input"
          type="search"
          placeholder="جستجو در نام فایل…"
          [ngModel]="searchTerm()"
          (ngModelChange)="onSearchInput()"
          (input)="onSearchInput()"
        />
      </div>
    </div>

    @if (uploading()) {
      <div
        class="card card-pad row"
        style="gap: var(--space-2); align-items: center; margin-bottom: var(--space-4)"
      >
        <span class="spinner spinner-sm"></span>
        @if (progress() !== null) {
          <span class="text-sm">در حال آپلود… {{ progress() }}٪</span>
          <div class="upload-bar">
            <span class="upload-fill" [style.width.%]="progress()"></span>
          </div>
        } @else {
          <span class="text-sm">در حال آپلود فایل‌ها…</span>
        }
      </div>
    }

    @if (loading()) {
      <app-spinner label="در حال بارگذاری فایل‌ها…" />
    } @else if (!items().length) {
      <app-empty-state
        icon="image"
        title="فایلی یافت نشد"
        description="اولین فایل خود را آپلود کنید یا فیلترها را تغییر دهید."
        actionLabel="آپلود فایل"
        actionIcon="upload"
        (action)="uploadInput.click()"
      />
    } @else {
      <div class="media-grid">
        @for (item of items(); track item._id) {
          <div class="media-item card" (click)="openDetail(item)">
            @if (isImage(item)) {
              <img [src]="item.url" [alt]="item.alt || item.originalName" loading="lazy" />
            } @else {
              <div class="media-placeholder">
                <app-icon
                  [name]="item.mimeType.startsWith('video/') ? 'video' : 'file'"
                  [size]="24"
                />
              </div>
            }
            <div class="media-info">
              <p class="media-name clamp-1">{{ item.originalName }}</p>
              <p class="text-xs text-faint">{{ formatSize(item.size) }} · {{ item.folder }}</p>
            </div>
          </div>
        }
      </div>

      <div class="row" style="justify-content: center; margin-top: var(--space-5)">
        <app-pagination
          [page]="page()"
          [totalPages]="totalPages()"
          (pageChange)="goToPage($event)"
        />
      </div>
    }

    @if (detailOpen()) {
      <app-modal [open]="true" title="جزئیات فایل" (closed)="detailOpen.set(false)">
        <div class="stack-lg">
          @if (detail(); as item) {
            @if (isImage(item)) {
              <img class="cover-preview" [src]="item.url" [alt]="item.alt || item.originalName" />
            }

            <div class="field">
              <label class="label">آدرس فایل</label>
              <div class="row">
                <input class="input grow" dir="ltr" readonly [value]="item.url" />
                <button
                  type="button"
                  class="btn btn-ghost btn-icon"
                  (click)="copyUrl(item)"
                  aria-label="کپی آدرس"
                >
                  <app-icon name="copy" [size]="16" />
                </button>
              </div>
            </div>

            <div class="field">
              <label class="label">متن جایگزین (Alt)</label>
              <input class="input" [(ngModel)]="editAlt" name="alt" />
            </div>

            <div class="field">
              <label class="label">پوشه</label>
              <input class="input" [(ngModel)]="editFolder" name="folder" />
            </div>

            <p class="text-xs text-faint">
              {{ item.mimeType }} · {{ formatSize(item.size) }}
              @if (item.width && item.height) {
                · {{ item.width | faNumber }} × {{ item.height | faNumber }}
              }
            </p>
          }
        </div>

        <div modalFooter>
          <button
            type="button"
            class="btn btn-danger-soft"
            (click)="confirmDelete(detail()!)"
            [disabled]="deleting()"
          >
            <app-icon name="trash" [size]="16" />
            حذف
          </button>
          <button type="button" class="btn btn-ghost" (click)="detailOpen.set(false)">بستن</button>
          <button
            type="button"
            class="btn btn-primary"
            (click)="saveDetail()"
            [disabled]="saving()"
          >
            @if (saving()) {
              <span class="spinner spinner-sm"></span>
            }
            ذخیره تغییرات
          </button>
        </div>
      </app-modal>
    }

    <app-confirm-dialog
      [open]="confirmOpen()"
      title="حذف فایل"
      [message]="deleteMessage()"
      [busy]="deleting()"
      (confirm)="performDelete()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
  styles: `
    .upload-bar {
      flex: 1;
      max-width: 240px;
      height: 6px;
      border-radius: var(--radius-full);
      background: var(--bg-inset);
      overflow: hidden;
    }

    .upload-fill {
      display: block;
      height: 100%;
      border-radius: var(--radius-full);
      background: var(--accent);
      transition: width var(--transition-fast);
    }

    .media-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--space-4);
    }

    .media-item {
      overflow: hidden;
      cursor: pointer;
      transition:
        transform var(--transition-fast),
        box-shadow var(--transition-fast);
    }

    .media-item:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .media-item img,
    .media-placeholder {
      width: 100%;
      height: 140px;
      object-fit: cover;
      display: grid;
      place-items: center;
      background: var(--bg-inset);
      color: var(--text-faint);
    }

    .media-info {
      padding: var(--space-3);
    }

    .media-name {
      margin: 0 0 2px;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .cover-preview {
      width: 100%;
      max-height: 260px;
      object-fit: cover;
      border-radius: var(--radius-sm);
    }

    @media (max-width: 900px) {
      .media-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class MediaPage {
  private readonly mediaService = inject(MediaService);
  private readonly chunkedUpload = inject(ChunkedUploadService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly progress = signal<number | null>(null);
  protected readonly items = signal<MediaItem[]>([]);
  protected readonly folders = signal<string[]>([]);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);

  protected readonly folder = signal('');
  protected readonly type = signal<'image' | 'video' | ''>('');
  protected readonly searchTerm = signal('');

  protected readonly detailOpen = signal(false);
  protected readonly detail = signal<MediaItem | null>(null);
  protected readonly confirmOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);

  protected editAlt = '';
  protected editFolder = '';

  constructor() {
    this.seo.set({ title: 'کتابخانه رسانه | پنل مدیریت' });
    this.load();
  }

  protected setFolder(value: string): void {
    this.folder.set(value);
    this.page.set(1);
    this.load();
  }

  protected setType(value: 'image' | 'video' | ''): void {
    this.type.set(value);
    this.page.set(1);
    this.load();
  }

  protected onSearchInput(): void {
    this.page.set(1);
    this.load();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (!files.length) return;

    const folder = this.folder() || 'general';
    // Videos go through the resumable chunked uploader (they easily exceed
    // the 12 MB multipart cap); everything else keeps the fast batch path.
    const chunkedFiles = files.filter(isVideoFile);
    const multipartFiles = files.filter((file) => !chunkedFiles.includes(file));

    // Non-video files cannot use the chunked endpoint (video-only server
    // side), so reject oversized ones up front with a clear message.
    const oversized = multipartFiles.filter((file) => file.size > MAX_MULTIPART_SIZE);
    const batch = multipartFiles.filter((file) => !oversized.includes(file));
    if (oversized.length) {
      const names = oversized.map((file) => file.name).join('، ');
      this.toast.error(`حجم این فایل‌ها بیش از ۱۰ مگابایت است و آپلود نشدند: ${names}`);
    }

    if (!batch.length && !chunkedFiles.length) return;

    this.uploading.set(true);
    this.progress.set(null);

    const tasks: Observable<unknown>[] = [];
    if (batch.length) tasks.push(this.mediaService.upload(batch, folder));
    chunkedFiles.forEach((file) =>
      tasks.push(
        this.chunkedUpload.upload(file, {
          folder: 'article-videos',
          onProgress: (progress) =>
            this.progress.set(Math.round((progress.loaded / progress.total) * 100)),
        }),
      ),
    );

    concat(...tasks).subscribe({
      complete: () => {
        this.uploading.set(false);
        this.progress.set(null);
        this.toast.success('فایل‌ها آپلود شدند');
        this.load();
      },
      error: (error: Error) => {
        this.uploading.set(false);
        this.progress.set(null);
        this.toast.error(error.message || 'آپلود انجام نشد');
        this.load();
      },
    });
  }

  protected openDetail(item: MediaItem): void {
    this.detail.set(item);
    this.editAlt = item.alt ?? '';
    this.editFolder = item.folder;
    this.detailOpen.set(true);
  }

  protected saveDetail(): void {
    const item = this.detail();
    if (!item) return;

    this.saving.set(true);
    this.mediaService.update(item._id, { alt: this.editAlt, folder: this.editFolder }).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.detailOpen.set(false);
        this.toast.success('فایل به‌روزرسانی شد');
        this.patchItem(updated);
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.error(error.message || 'ذخیره انجام نشد');
      },
    });
  }

  protected confirmDelete(item: MediaItem): void {
    this.detail.set(item);
    this.confirmOpen.set(true);
  }

  protected deleteMessage(): string {
    const item = this.detail();
    return item ? `فایل «${item.originalName}» برای همیشه حذف می‌شود.` : '';
  }

  protected performDelete(): void {
    const item = this.detail();
    if (!item) return;

    this.deleting.set(true);
    this.mediaService.remove(item._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmOpen.set(false);
        this.detailOpen.set(false);
        this.toast.success('فایل حذف شد');
        this.load();
      },
      error: (error: Error) => {
        this.deleting.set(false);
        this.toast.error(error.message || 'حذف انجام نشد');
      },
    });
  }

  protected copyUrl(item: MediaItem): void {
    void navigator.clipboard.writeText(item.url).then(() => this.toast.success('آدرس کپی شد'));
  }

  protected isImage(item: MediaItem): boolean {
    return item.mimeType.startsWith('image/');
  }

  protected formatSize = formatFileSize;

  private load(): void {
    this.loading.set(true);
    this.mediaService
      .list({
        page: this.page(),
        limit: 24,
        folder: this.folder(),
        type: this.type(),
        q: this.searchTerm().trim(),
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items ?? []);
          this.folders.set(result.meta?.folders ?? []);
          this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
          this.loading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.loading.set(false);
        },
      });
  }

  private patchItem(updated: MediaItem): void {
    this.items.update((list) => list.map((item) => (item._id === updated._id ? updated : item)));
  }
}
