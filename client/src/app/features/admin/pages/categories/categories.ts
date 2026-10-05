import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { CategoryService } from '../../../../core/services/taxonomy.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { Category, CategoryPayload } from '../../../../core/models/taxonomy.model';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-categories-page',
  imports: [
    FormsModule,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    ModalComponent,
    ConfirmDialogComponent,
    FaNumberPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>دسته‌بندی‌ها</h1>
        <p class="text-sm text-muted">مدیریت دسته‌بندی‌های سایت و ترتیب نمایش آن‌ها.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="openEditor()">
        <app-icon name="plus-circle" [size]="18" />
        دسته‌بندی جدید
      </button>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری دسته‌بندی‌ها…" />
    } @else if (!categories().length) {
      <app-empty-state
        icon="folder"
        title="دسته‌بندی‌ای وجود ندارد"
        description="اولین دسته‌بندی را ایجاد کنید تا بتوانید خبرها را سازمان‌دهی کنید."
        actionLabel="ایجاد دسته‌بندی"
        actionIcon="plus-circle"
        (action)="openEditor()"
      />
    } @else {
      <div class="table-wrap card">
        <table class="table">
          <thead>
            <tr>
              <th>ترتیب</th>
              <th>نام</th>
              <th>نامک</th>
              <th>تعداد مطالب</th>
              <th>وضعیت</th>
              <th>نمایش در منو</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            @for (category of categories(); track category._id) {
              <tr>
                <td>
                  <div class="row" style="gap: var(--space-1)">
                    <button type="button" class="btn btn-ghost btn-icon btn-sm" (click)="move(category, -1)" aria-label="انتقال به بالا">
                      <app-icon name="chevron-down" [size]="16" style="rotate: 180deg" />
                    </button>
                    <button type="button" class="btn btn-ghost btn-icon btn-sm" (click)="move(category, 1)" aria-label="انتقال به پایین">
                      <app-icon name="chevron-down" [size]="16" />
                    </button>
                    <span class="text-sm text-muted">{{ category.order | faNumber }}</span>
                  </div>
                </td>
                <td>
                  <div class="cell-article">
                    @if (category.icon) {
                      <span class="cell-thumb cell-thumb-empty">
                        <app-icon [name]="category.icon" [size]="16" />
                      </span>
                    }
                    <div>
                      <span class="row-title">{{ category.name }}</span>
                      @if (category.description) {
                        <span class="text-xs text-faint clamp-1">{{ category.description }}</span>
                      }
                    </div>
                  </div>
                </td>
                <td class="text-sm text-muted" dir="ltr">{{ category.slug }}</td>
                <td class="text-sm">{{ category.articlesCount ?? 0 | faNumber }}</td>
                <td>
                  <span class="badge" [class]="category.isActive ? 'badge badge-success' : 'badge'">
                    {{ category.isActive ? 'فعال' : 'غیرفعال' }}
                  </span>
                </td>
                <td>
                  <span class="badge" [class]="category.showInMenu ? 'badge badge-info' : 'badge'">
                    {{ category.showInMenu ? 'نمایش' : 'مخفی' }}
                  </span>
                </td>
                <td class="col-actions">
                  <div class="row-actions">
                    <button type="button" class="btn btn-ghost btn-icon btn-sm" (click)="openEditor(category)" aria-label="ویرایش">
                      <app-icon name="edit" [size]="16" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon btn-sm is-danger"
                      (click)="confirmDelete(category)"
                      aria-label="حذف"
                    >
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
      <app-modal
        [open]="true"
        [title]="editing()?._id ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'"
        (closed)="editorOpen.set(false)"
      >
        <div class="stack-lg">
          <div class="field">
            <label class="label">نام <span class="req">*</span></label>
            <input class="input" [(ngModel)]="form.name" name="name" placeholder="مثال: فناوری" />
          </div>

          <div class="field">
            <label class="label">نامک (Slug)</label>
            <input class="input" dir="ltr" [(ngModel)]="form.slug" name="slug" placeholder="technology" />
          </div>

          <div class="field">
            <label class="label">توضیح</label>
            <textarea class="textarea" rows="3" [(ngModel)]="form.description" name="description"></textarea>
          </div>

          <div class="grid-2">
            <div class="field">
              <label class="label">رنگ</label>
              <div class="color-input-row">
                <input type="color" [(ngModel)]="form.color" name="color" />
                <input class="input" dir="ltr" [(ngModel)]="form.color" name="colorHex" placeholder="#2563eb" />
              </div>
            </div>

            <div class="field">
              <label class="label">آیکن</label>
              <input class="input" dir="ltr" [(ngModel)]="form.icon" name="icon" placeholder="folder" />
            </div>
          </div>

          <div class="grid-2">
            <div class="field">
              <label class="label">ترتیب</label>
              <input class="input" type="number" [(ngModel)]="form.order" name="order" />
            </div>

            <div class="field">
              <label class="label">تصویر شاخص</label>
              <input class="input" dir="ltr" [(ngModel)]="form.cover" name="cover" placeholder="/uploads/…" />
            </div>
          </div>

          <div class="grid-2">
            <label class="switch">
              <input type="checkbox" [(ngModel)]="form.isActive" name="isActive" />
              <span class="track"></span>
            </label>
            <span class="text-sm">فعال</span>

            <label class="switch">
              <input type="checkbox" [(ngModel)]="form.showInMenu" name="showInMenu" />
              <span class="track"></span>
            </label>
            <span class="text-sm">نمایش در منوی سایت</span>
          </div>
        </div>

        <div modalFooter>
          <button type="button" class="btn btn-ghost" (click)="editorOpen.set(false)">انصراف</button>
          <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner spinner-sm"></span>
            }
            {{ editing()?._id ? 'ذخیره تغییرات' : 'ایجاد دسته‌بندی' }}
          </button>
        </div>
      </app-modal>
    }

    <app-confirm-dialog
      [open]="confirmOpen()"
      title="حذف دسته‌بندی"
      [message]="deleteMessage()"
      [busy]="deleting()"
      (confirm)="performDelete()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
  styles: `
    .cell-thumb-empty {
      width: 42px;
      height: 32px;
      flex: none;
      border-radius: var(--radius-xs);
      background: var(--bg-inset);
      color: var(--text-faint);
      display: grid;
      place-items: center;
    }
  `,
})
export class CategoriesPage {
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly categories = signal<Category[]>([]);

  protected readonly editorOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly editing = signal<Category | null>(null);
  protected readonly deleteTarget = signal<Category | null>(null);

  protected readonly form = this.emptyForm();

  constructor() {
    this.seo.set({ title: 'دسته‌بندی‌ها | پنل مدیریت' });
    this.load();
  }

  protected openEditor(category?: Category): void {
    this.editing.set(category ?? null);
    this.form.name = category?.name ?? '';
    this.form.slug = category?.slug ?? '';
    this.form.description = category?.description ?? '';
    this.form.color = category?.color ?? '#2563eb';
    this.form.icon = category?.icon ?? '';
    this.form.cover = category?.cover ?? '';
    this.form.order = category?.order ?? 0;
    this.form.isActive = category?.isActive ?? true;
    this.form.showInMenu = category?.showInMenu ?? true;
    this.editorOpen.set(true);
  }

  protected save(): void {
    if (!this.form.name.trim()) {
      this.toast.warning('نام دسته‌بندی را وارد کنید');
      return;
    }

    this.saving.set(true);
    const payload: CategoryPayload = {
      name: this.form.name.trim(),
      slug: this.form.slug || undefined,
      description: this.form.description || undefined,
      color: this.form.color || undefined,
      icon: this.form.icon || undefined,
      cover: this.form.cover || undefined,
      order: this.form.order,
      isActive: this.form.isActive,
      showInMenu: this.form.showInMenu,
    };

    const editing = this.editing();
    const request = editing
      ? this.categoryService.update(editing._id, payload)
      : this.categoryService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.toast.success(editing ? 'دسته‌بندی به‌روزرسانی شد' : 'دسته‌بندی ایجاد شد');
        this.load();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.error(error.message || 'ذخیره انجام نشد');
      },
    });
  }

  protected confirmDelete(category: Category): void {
    this.deleteTarget.set(category);
    this.confirmOpen.set(true);
  }

  protected deleteMessage(): string {
    const category = this.deleteTarget();
    return category ? `دسته‌بندی «${category.name}» برای همیشه حذف می‌شود.` : '';
  }

  protected performDelete(): void {
    const category = this.deleteTarget();
    if (!category) return;

    this.deleting.set(true);
    this.categoryService.remove(category._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmOpen.set(false);
        this.toast.success('دسته‌بندی حذف شد');
        this.load();
      },
      error: (error: Error) => {
        this.deleting.set(false);
        this.toast.error(error.message || 'حذف انجام نشد');
      },
    });
  }

  protected move(category: Category, direction: 1 | -1): void {
    const items = [...this.categories()];
    const index = items.findIndex((item) => item._id === category._id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;

    const [moved] = items.splice(index, 1);
    items.splice(target, 0, moved);
    this.categories.set(items);

    this.categoryService
      .reorder(items.map((item, order) => ({ id: item._id, order })))
      .subscribe({
        next: () => this.toast.success('ترتیب ذخیره شد'),
        error: () => this.load(),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.categoryService.adminList().subscribe({
      next: (items) => {
        this.categories.set(items ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.categories.set([]);
        this.loading.set(false);
      },
    });
  }

  private emptyForm() {
    return {
      name: '',
      slug: '',
      description: '',
      color: '#2563eb',
      icon: '',
      cover: '',
      order: 0,
      isActive: true,
      showInMenu: true,
    };
  }
}