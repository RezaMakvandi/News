import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { TagService } from '../../../../core/services/taxonomy.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { Tag } from '../../../../core/models/taxonomy.model';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-tags-page',
  imports: [
    FormsModule,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    ModalComponent,
    ConfirmDialogComponent,
    FaNumberPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>برچسب‌ها</h1>
        <p class="text-sm text-muted">مدیریت برچسب‌های محتوایی سایت.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="openEditor()">
        <app-icon name="plus-circle" [size]="18" />
        برچسب جدید
      </button>
    </div>

    <div class="filter-bar">
      <div class="input-search">
        <app-icon name="search" [size]="16" />
        <input
          class="input"
          type="search"
          placeholder="جستجو در برچسب‌ها…"
          [ngModel]="searchTerm()" (ngModelChange)="onSearchInput()"
          (input)="onSearchInput()"
        />
      </div>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری برچسب‌ها…" />
    } @else if (!tags().length) {
      <app-empty-state
        icon="tag"
        title="برچسبی یافت نشد"
        description="برچسب جدیدی ایجاد کنید یا عبارت جستجو را تغییر دهید."
        actionLabel="ایجاد برچسب"
        actionIcon="plus-circle"
        (action)="openEditor()"
      />
    } @else {
      <div class="tag-cloud card card-pad">
        @for (tag of tags(); track tag._id) {
          <span class="chip">
            {{ tag.name }}
            <span class="text-xs text-muted">({{ tag.usageCount | faNumber }})</span>
            <button type="button" class="chip-action" (click)="openEditor(tag)" aria-label="ویرایش">
              <app-icon name="edit" [size]="12" />
            </button>
            <button type="button" class="chip-action is-danger" (click)="confirmDelete(tag)" aria-label="حذف">
              <app-icon name="trash" [size]="12" />
            </button>
          </span>
        }
      </div>

      <div class="row" style="justify-content: center; margin-top: var(--space-4)">
        <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="goToPage($event)" />
      </div>
    }

    @if (editorOpen()) {
      <app-modal [open]="true" [title]="editing()?._id ? 'ویرایش برچسب' : 'برچسب جدید'" (closed)="editorOpen.set(false)">
        <div class="stack-lg">
          <div class="field">
            <label class="label">نام <span class="req">*</span></label>
            <input class="input" [(ngModel)]="form.name" name="name" placeholder="مثال: هوش مصنوعی" />
          </div>

          <div class="field">
            <label class="label">نامک (Slug)</label>
            <input class="input" dir="ltr" [(ngModel)]="form.slug" name="slug" placeholder="ai" />
          </div>

          <div class="field">
            <label class="label">توضیح</label>
            <textarea class="textarea" rows="3" [(ngModel)]="form.description" name="description"></textarea>
          </div>
        </div>

        <div modalFooter>
          <button type="button" class="btn btn-ghost" (click)="editorOpen.set(false)">انصراف</button>
          <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner spinner-sm"></span>
            }
            {{ editing()?._id ? 'ذخیره تغییرات' : 'ایجاد برچسب' }}
          </button>
        </div>
      </app-modal>
    }

    <app-confirm-dialog
      [open]="confirmOpen()"
      title="حذف برچسب"
      [message]="deleteMessage()"
      [busy]="deleting()"
      (confirm)="performDelete()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
  styles: `
    .chip-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      margin-inline-start: var(--space-1);
      border: 0;
      background: transparent;
      color: var(--text-faint);
      border-radius: var(--radius-xs);
      cursor: pointer;
    }

    .chip-action:hover {
      color: var(--text);
      background: var(--bg-hover);
    }

    .chip-action.is-danger:hover {
      color: var(--danger);
      background: var(--danger-soft);
    }
  `,
})
export class TagsPage {
  private readonly tagService = inject(TagService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly tags = signal<Tag[]>([]);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);

  protected readonly searchTerm = signal('');

  protected readonly editorOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly editing = signal<Tag | null>(null);
  protected readonly deleteTarget = signal<Tag | null>(null);

  protected readonly form = { name: '', slug: '', description: '' };

  constructor() {
    this.seo.set({ title: 'برچسب‌ها | پنل مدیریت' });
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

  protected openEditor(tag?: Tag): void {
    this.editing.set(tag ?? null);
    this.form.name = tag?.name ?? '';
    this.form.slug = tag?.slug ?? '';
    this.form.description = tag?.description ?? '';
    this.editorOpen.set(true);
  }

  protected save(): void {
    if (!this.form.name.trim()) {
      this.toast.warning('نام برچسب را وارد کنید');
      return;
    }

    this.saving.set(true);
    const editing = this.editing();
    const payload = {
      name: this.form.name.trim(),
      slug: this.form.slug || undefined,
      description: this.form.description || undefined,
    };

    const request = editing
      ? this.tagService.update(editing._id, payload)
      : this.tagService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.toast.success(editing ? 'برچسب به‌روزرسانی شد' : 'برچسب ایجاد شد');
        this.load();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.error(error.message || 'ذخیره انجام نشد');
      },
    });
  }

  protected confirmDelete(tag: Tag): void {
    this.deleteTarget.set(tag);
    this.confirmOpen.set(true);
  }

  protected deleteMessage(): string {
    const tag = this.deleteTarget();
    return tag ? `برچسب «${tag.name}» برای همیشه حذف می‌شود.` : '';
  }

  protected performDelete(): void {
    const tag = this.deleteTarget();
    if (!tag) return;

    this.deleting.set(true);
    this.tagService.remove(tag._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmOpen.set(false);
        this.toast.success('برچسب حذف شد');
        this.load();
      },
      error: (error: Error) => {
        this.deleting.set(false);
        this.toast.error(error.message || 'حذف انجام نشد');
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.tagService
      .adminList({ page: this.page(), limit: 40, q: this.searchTerm().trim() })
      .subscribe({
        next: (result) => {
          this.tags.set(result.items ?? []);
          this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
          this.loading.set(false);
        },
        error: () => {
          this.tags.set([]);
          this.loading.set(false);
        },
      });
  }
}