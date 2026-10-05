import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { SettingsService } from '../../../../core/services/settings.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { Page, PagePayload } from '../../../../core/models/settings.model';
import { FaDatePipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-pages-page',
  imports: [
    RouterLink,
    FormsModule,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    ModalComponent,
    FaDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>صفحات ثابت</h1>
        <p class="text-sm text-muted">مدیریت صفحاتی مانند «درباره ما» و «قوانین».</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="openEditor()">
        <app-icon name="plus-circle" [size]="18" />
        صفحه جدید
      </button>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری صفحات…" />
    } @else if (!pages().length) {
      <app-empty-state
        icon="file"
        title="صفحه‌ای وجود ندارد"
        description="اولین صفحه ثابت را ایجاد کنید."
        actionLabel="ایجاد صفحه"
        actionIcon="plus-circle"
        (action)="openEditor()"
      />
    } @else {
      <div class="table-wrap card">
        <table class="table">
          <thead>
            <tr>
              <th>عنوان</th>
              <th>نامک</th>
              <th>وضعیت</th>
              <th>نمایش در پاورقی</th>
              <th>آخرین به‌روزرسانی</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            @for (page of pages(); track page._id) {
              <tr>
                <td>
                  <a class="row-title clamp-1" [routerLink]="['/page', page.slug]" target="_blank">{{ page.title }}</a>
                </td>
                <td class="text-sm text-muted" dir="ltr">{{ page.slug }}</td>
                <td>
                  <span class="badge" [class]="page.isPublished ? 'badge badge-success' : 'badge'">
                    {{ page.isPublished ? 'منتشر شده' : 'پیش‌نویس' }}
                  </span>
                </td>
                <td>
                  <span class="badge" [class]="page.showInFooter ? 'badge badge-info' : 'badge'">
                    {{ page.showInFooter ? 'نمایش' : 'مخفی' }}
                  </span>
                </td>
                <td class="text-sm text-muted">{{ page.updatedAt | faDate: 'short' }}</td>
                <td class="col-actions">
                  <div class="row-actions">
                    <button type="button" class="btn btn-ghost btn-icon btn-sm" (click)="openEditor(page)" aria-label="ویرایش">
                      <app-icon name="edit" [size]="16" />
                    </button>
                    <button type="button" class="btn btn-ghost btn-icon btn-sm is-danger" (click)="confirmDelete(page)" aria-label="حذف">
                      <app-icon name="trash" [size]="16" />
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (editorOpen()) {
      <app-modal [open]="true" size="xl" [title]="editing()?._id ? 'ویرایش صفحه' : 'صفحه جدید'" (closed)="editorOpen.set(false)">
        <div class="stack-lg">
          <div class="field">
            <label class="label">عنوان <span class="req">*</span></label>
            <input class="input" [(ngModel)]="form.title" name="title" placeholder="مثال: درباره ما" />
          </div>

          <div class="field">
            <label class="label">نامک (Slug)</label>
            <input class="input" dir="ltr" [(ngModel)]="form.slug" name="slug" placeholder="about-us" />
          </div>

          <div class="field">
            <label class="label">متن صفحه <span class="req">*</span></label>
            <textarea class="textarea" rows="12" [(ngModel)]="form.content" name="content" dir="auto"></textarea>
          </div>

          <div class="grid-2">
            <label class="switch">
              <input type="checkbox" [(ngModel)]="form.isPublished" name="isPublished" />
              <span class="track"></span>
            </label>
            <span class="text-sm">منتشر شده</span>

            <label class="switch">
              <input type="checkbox" [(ngModel)]="form.showInFooter" name="showInFooter" />
              <span class="track"></span>
            </label>
            <span class="text-sm">نمایش در پاورقی سایت</span>
          </div>

          <div class="field">
            <label class="label">ترتیب</label>
            <input class="input" type="number" [(ngModel)]="form.order" name="order" />
          </div>

          <div class="field">
            <label class="label">عنوان سئو</label>
            <input class="input" [(ngModel)]="form.seoTitle" name="seoTitle" />
          </div>

          <div class="field">
            <label class="label">توضیحات سئو</label>
            <textarea class="textarea" rows="3" [(ngModel)]="form.seoDescription" name="seoDescription"></textarea>
          </div>
        </div>

        <div modalFooter>
          <button type="button" class="btn btn-ghost" (click)="editorOpen.set(false)">انصراف</button>
          <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner spinner-sm"></span>
            }
            {{ editing()?._id ? 'ذخیره تغییرات' : 'ایجاد صفحه' }}
          </button>
        </div>
      </app-modal>
    }

    <app-confirm-dialog
      [open]="confirmOpen()"
      title="حذف صفحه"
      [message]="deleteMessage()"
      [busy]="deleting()"
      (confirm)="performDelete()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
})
export class PagesPage {
  private readonly settingsService = inject(SettingsService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly pages = signal<Page[]>([]);

  protected readonly editorOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly editing = signal<Page | null>(null);
  protected readonly deleteTarget = signal<Page | null>(null);

  protected readonly form = {
    title: '',
    slug: '',
    content: '',
    isPublished: true,
    showInFooter: true,
    order: 0,
    seoTitle: '',
    seoDescription: '',
  };

  constructor() {
    this.seo.set({ title: 'صفحات ثابت | پنل مدیریت' });
    this.load();
  }

  protected openEditor(page?: Page): void {
    this.editing.set(page ?? null);
    this.form.title = page?.title ?? '';
    this.form.slug = page?.slug ?? '';
    this.form.content = page?.content ?? '';
    this.form.isPublished = page?.isPublished ?? true;
    this.form.showInFooter = page?.showInFooter ?? true;
    this.form.order = page?.order ?? 0;
    this.form.seoTitle = page?.seo?.title ?? '';
    this.form.seoDescription = page?.seo?.description ?? '';
    this.editorOpen.set(true);
  }

  protected save(): void {
    if (!this.form.title.trim()) {
      this.toast.warning('عنوان صفحه را وارد کنید');
      return;
    }
    if (this.form.content.trim().length < 10) {
      this.toast.warning('متن صفحه باید حداقل ۱۰ کاراکتر باشد');
      return;
    }

    this.saving.set(true);
    const payload: PagePayload = {
      title: this.form.title.trim(),
      slug: this.form.slug || undefined,
      content: this.form.content,
      isPublished: this.form.isPublished,
      showInFooter: this.form.showInFooter,
      order: this.form.order,
      seo: {
        title: this.form.seoTitle || undefined,
        description: this.form.seoDescription || undefined,
      },
    };

    const editing = this.editing();
    const request = editing
      ? this.settingsService.updatePage(editing._id, payload)
      : this.settingsService.createPage(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.toast.success(editing ? 'صفحه به‌روزرسانی شد' : 'صفحه ایجاد شد');
        this.load();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.error(error.message || 'ذخیره انجام نشد');
      },
    });
  }

  protected confirmDelete(page: Page): void {
    this.deleteTarget.set(page);
    this.confirmOpen.set(true);
  }

  protected deleteMessage(): string {
    const page = this.deleteTarget();
    return page ? `صفحه «${page.title}» برای همیشه حذف می‌شود.` : '';
  }

  protected performDelete(): void {
    const page = this.deleteTarget();
    if (!page) return;

    this.deleting.set(true);
    this.settingsService.deletePage(page._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmOpen.set(false);
        this.toast.success('صفحه حذف شد');
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
    this.settingsService.adminPages().subscribe({
      next: (items) => {
        this.pages.set(items ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.pages.set([]);
        this.loading.set(false);
      },
    });
  }
}