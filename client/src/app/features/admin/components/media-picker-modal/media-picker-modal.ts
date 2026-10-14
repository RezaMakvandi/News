import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { forkJoin, map, type Observable } from 'rxjs';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { MediaService } from '../../../../core/services/media.service';
import {
  ChunkedUploadService,
  UploadProgress,
} from '../../../../core/services/chunked-upload.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { MediaItem } from '../../../../core/models/media.model';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif';
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/ogg,.mp4,.webm,.mov,.mkv,.ogv,.m4v';
const PAGE_SIZE = 24;

const isVideoFile = (file: File): boolean =>
  file.type.startsWith('video/') || /\.(mp4|webm|ogv|ogg|mov|mkv|m4v)$/i.test(file.name);

/** Which kinds of media the picker offers. */
export type MediaPickerMode = 'image' | 'video' | 'all';

/**
 * Reusable media-library modal: browse/search the library, upload new files
 * (videos go through the resumable chunked uploader), then pick one item
 * (single mode) or several (multiple mode) and hand them to the consumer.
 */
@Component({
  selector: 'app-media-picker-modal',
  imports: [
    ModalComponent,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [title]="title()" [open]="open()" size="xl" (closed)="closed.emit()">
      <div class="picker-toolbar">
        <div class="picker-search">
          <app-icon name="search" [size]="16" />
          <input
            #searchBox
            class="input"
            type="search"
            placeholder="جستجو در نام فایل…"
            (input)="onSearch(searchBox.value)"
          />
        </div>

        <button
          type="button"
          class="btn btn-primary btn-sm"
          [disabled]="uploading()"
          (click)="pickFiles()"
        >
          <app-icon name="upload" [size]="16" />
          بارگذاری فایل
        </button>

        <input
          #fileInput
          type="file"
          multiple
          hidden
          [accept]="accept()"
          (change)="onFilesSelected($event)"
        />
      </div>

      @if (uploading()) {
        <div class="picker-upload-state">
          @if (progress() !== null) {
            <span class="text-sm">در حال آپلود… {{ progress() }}٪</span>
            <div class="picker-bar">
              <span class="picker-fill" [style.width.%]="progress()"></span>
            </div>
          } @else {
            <span class="spinner spinner-sm"></span>
            <span class="text-sm">در حال آپلود فایل‌ها…</span>
          }
        </div>
      }

      @if (loading()) {
        <app-spinner label="در حال بارگذاری کتابخانه…" />
      } @else if (!items().length) {
        <app-empty-state
          icon="image"
          title="فایلی یافت نشد"
          description="فایلی بارگذاری کنید یا عبارت جستجو را تغییر دهید."
          actionLabel="بارگذاری فایل"
          actionIcon="upload"
          (action)="pickFiles()"
        />
      } @else {
        <div class="picker-grid">
          @for (item of items(); track item._id) {
            <button
              type="button"
              class="picker-item"
              [class.is-selected]="isSelected(item)"
              (click)="clickItem(item)"
            >
              @if (item.mimeType.startsWith('video/')) {
                <video
                  class="picker-thumb is-video"
                  [src]="item.url"
                  preload="metadata"
                  muted
                ></video>
                <span class="picker-kind"><app-icon name="video" [size]="13" /></span>
              } @else {
                <img
                  class="picker-thumb"
                  [src]="item.url"
                  [alt]="item.alt || item.originalName"
                  loading="lazy"
                />
              }
              @if (isSelected(item)) {
                <span class="picker-check"><app-icon name="check" [size]="14" /></span>
              }
              <span class="picker-name clamp-1">{{ item.originalName }}</span>
            </button>
          }
        </div>

        <div class="row" style="justify-content: center; margin-top: var(--space-4)">
          <app-pagination
            [page]="page()"
            [totalPages]="totalPages()"
            (pageChange)="goToPage($event)"
          />
        </div>
      }

      <div modalFooter class="picker-footer">
        @if (multiple()) {
          <span class="text-sm text-muted">
            {{
              selected().length
                ? selected().length + ' مورد انتخاب شد'
                : 'برای انتخاب چند مورد، روی آن‌ها کلیک کنید.'
            }}
          </span>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            [disabled]="!selected().length || uploading()"
            (click)="confirmSelection()"
          >
            <app-icon name="check" [size]="16" />
            تأیید انتخاب
          </button>
        } @else {
          <span class="text-sm text-muted">برای انتخاب، روی یک مورد کلیک کنید.</span>
        }
      </div>
    </app-modal>
  `,
  styles: `
    .picker-toolbar {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }

    .picker-search {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      padding: 0 var(--space-3);
    }

    .picker-search app-icon {
      color: var(--text-faint);
    }

    .picker-search .input {
      border: 0;
      background: transparent;
      padding-inline-start: 0;
    }

    .picker-search .input:focus {
      box-shadow: none;
    }

    .picker-upload-state {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-sm);
      background: var(--accent-softer);
    }

    .picker-bar {
      flex: 1;
      height: 6px;
      border-radius: var(--radius-full);
      background: var(--bg-inset);
      overflow: hidden;
    }

    .picker-fill {
      display: block;
      height: 100%;
      border-radius: var(--radius-full);
      background: var(--accent);
      transition: width var(--transition-fast);
    }

    .picker-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--space-3);
    }

    .picker-item {
      position: relative;
      border: 2px solid transparent;
      border-radius: var(--radius-sm);
      padding: 4px;
      background: var(--surface-2);
      cursor: pointer;
      display: grid;
      gap: 4px;
      text-align: center;
      transition: border-color var(--transition-fast);
    }

    .picker-item:hover,
    .picker-item:focus-visible {
      border-color: var(--accent);
    }

    .picker-item.is-selected {
      border-color: var(--accent);
      background: var(--accent-softer);
    }

    .picker-thumb {
      width: 100%;
      height: 90px;
      object-fit: cover;
      border-radius: var(--radius-xs);
      display: block;
    }

    .picker-thumb.is-video {
      background: #000;
    }

    .picker-kind {
      position: absolute;
      top: 10px;
      inset-inline-start: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: var(--radius-full);
      background: rgb(0 0 0 / 0.55);
      color: #fff;
    }

    .picker-check {
      position: absolute;
      top: 10px;
      inset-inline-end: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: var(--radius-full);
      background: var(--accent);
      color: var(--accent-contrast);
    }

    .picker-name {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .picker-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      width: 100%;
    }

    @media (max-width: 720px) {
      .picker-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class MediaPickerModalComponent {
  readonly open = input(true);
  readonly mode = input<MediaPickerMode>('all');
  readonly multiple = input(false);
  readonly title = input('کتابخانه رسانه');

  /** Emits the chosen item(s); consumer is responsible for closing the modal. */
  readonly picked = output<MediaItem[]>();
  readonly closed = output<void>();

  private readonly mediaService = inject(MediaService);
  private readonly chunkedUpload = inject(ChunkedUploadService);
  private readonly toast = inject(ToastService);

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly loading = signal(false);
  protected readonly uploading = signal(false);
  protected readonly progress = signal<number | null>(null);
  protected readonly items = signal<MediaItem[]>([]);
  protected readonly selected = signal<MediaItem[]>([]);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly searchTerm = signal('');

  protected readonly accept = computed(() => {
    const mode = this.mode();
    if (mode === 'image') return IMAGE_ACCEPT;
    if (mode === 'video') return VIDEO_ACCEPT;
    return `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`;
  });

  private readonly typeFilter = computed<'image' | 'video' | ''>(() => {
    const mode = this.mode();
    return mode === 'all' ? '' : mode;
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.page.set(1);
        this.selected.set([]);
        this.reload();
      }
    });
  }

  protected onSearch(term: string): void {
    this.searchTerm.set(term.trim());
    this.page.set(1);
    this.reload();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.reload();
  }

  protected clickItem(item: MediaItem): void {
    if (this.multiple()) {
      this.selected.update((list) =>
        list.some((entry) => entry._id === item._id)
          ? list.filter((entry) => entry._id !== item._id)
          : [...list, item],
      );
    } else {
      this.picked.emit([item]);
      this.closed.emit();
    }
  }

  protected isSelected(item: MediaItem): boolean {
    return this.selected().some((entry) => entry._id === item._id);
  }

  protected confirmSelection(): void {
    const items = this.selected();
    if (!items.length) return;
    this.picked.emit(items);
    this.closed.emit();
  }

  protected pickFiles(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected onFilesSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const files = Array.from(inputEl.files ?? []);
    inputEl.value = '';
    if (!files.length) return;

    const tasks: Observable<MediaItem | undefined>[] = [];
    const skipped: string[] = [];

    for (const file of files) {
      if (isVideoFile(file)) {
        // Videos go through the resumable chunked uploader — they easily
        // exceed the multipart size cap.
        tasks.push(
          this.chunkedUpload.upload(file, {
            folder: 'article-videos',
            onProgress: (progress: UploadProgress) =>
              this.progress.set(Math.max(1, Math.round((progress.loaded / progress.total) * 100))),
          }),
        );
      } else if (file.type.startsWith('image/')) {
        tasks.push(this.mediaService.upload([file], 'article-images').pipe(map((list) => list[0])));
      } else {
        skipped.push(file.name);
      }
    }

    if (skipped.length) {
      this.toast.error(`فرمت این فایل‌ها پشتیبانی نمی‌شود: ${skipped.join('، ')}`);
    }
    if (!tasks.length) return;

    this.uploading.set(true);
    this.progress.set(null);

    forkJoin(tasks).subscribe({
      next: (uploaded) => {
        this.uploading.set(false);
        this.progress.set(null);
        const created = uploaded.filter((item): item is MediaItem => Boolean(item));
        if (!created.length) {
          this.toast.error('آپلود انجام نشد');
          return;
        }
        this.page.set(1);
        this.reload();
        if (this.multiple()) {
          this.selected.update((list) => [
            ...list,
            ...created.filter((item) => !list.some((entry) => entry._id === item._id)),
          ]);
          this.toast.success('فایل‌ها آپلود و انتخاب شدند');
        } else {
          this.picked.emit(created);
          this.closed.emit();
        }
      },
      error: (error: Error) => {
        this.uploading.set(false);
        this.progress.set(null);
        this.toast.error(error.message || 'آپلود انجام نشد');
      },
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.mediaService
      .list({
        page: this.page(),
        limit: PAGE_SIZE,
        q: this.searchTerm() || undefined,
        type: this.typeFilter(),
      })
      .subscribe({
        next: (result) => this.applyPage(result),
        error: () => {
          this.loading.set(false);
          this.toast.error('بارگذاری کتابخانه انجام نشد');
        },
      });
  }

  private applyPage(result: { items: MediaItem[]; meta: { totalPages?: number } }): void {
    this.items.set(result.items);
    this.totalPages.set(result.meta?.totalPages ?? 1);
    this.loading.set(false);
  }
}
