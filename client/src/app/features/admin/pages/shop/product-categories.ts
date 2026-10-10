import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ShopService } from '../../../../core/services/shop.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import type { ProductCategory } from '../../../../core/models/product.model';

@Component({
  selector: 'app-admin-product-categories',
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
        <h1>دستهبندی محصولات</h1>
        <p class="text-sm text-muted">دستهبندی کاتالوگ فروشگاه.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="openEditor()">
        <app-icon name="plus-circle" [size]="18" /> دسته جدید
      </button>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری..." />
    } @else if (!categories().length) {
      <app-empty-state
        icon="folder"
        title="دستهای یافت نشد"
        description="اولین دستهبندی محصول را ایجاد کنید."
        actionLabel="ایجاد دسته"
        actionIcon="plus-circle"
        (action)="openEditor()"
      />
    } @else {
      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>دستهبندی</th>
                <th>نامک</th>
                <th>تعداد محصول</th>
                <th>وضعیت</th>
                <th style="width:130px">عملیات</th>
              </tr>
            </thead>
            <tbody>
              @for (category of categories(); track category._id) {
                <tr>
                  <td>
                    <div class="row" style="gap:var(--space-2)">
                      <span
                        style="display:grid;place-items:center;width:32px;height:32px;border-radius:var(--radius-sm);background:var(--accent-soft);color:var(--accent)"
                      >
                        <app-icon [name]="category.icon || 'package'" [size]="16" />
                      </span>
                      <strong>{{ category.name }}</strong>
                    </div>
                  </td>
                  <td dir="ltr" class="text-sm text-muted">{{ category.slug }}</td>
                  <td>{{ category.productsCount || 0 | faNumber }}</td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-success]="category.isActive"
                      [class.badge-danger]="!category.isActive"
                    >
                      {{ category.isActive ? 'فعال' : 'غیرفعال' }}
                    </span>
                  </td>
                  <td>
                    <div class="row" style="gap:4px">
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon"
                        (click)="openEditor(category)"
                        aria-label="ویرایش"
                      >
                        <app-icon name="edit" [size]="16" />
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon"
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
      </div>
    }

    @if (editorOpen()) {
      <app-modal
        [open]="true"
        [title]="editing()?._id ? 'ویرایش دستهبندی' : 'دستهبندی جدید'"
        (closed)="editorOpen.set(false)"
      >
        <div class="stack-lg">
          <div class="field">
            <label class="label">نام <span class="req">*</span></label>
            <input class="input" [(ngModel)]="form.name" name="name" />
          </div>
          <div class="field">
            <label class="label">نامک (Slug)</label>
            <input class="input" dir="ltr" [(ngModel)]="form.slug" name="slug" />
          </div>
          <div class="field">
            <label class="label">آیکون</label>
            <input
              class="input"
              dir="ltr"
              [(ngModel)]="form.icon"
              name="icon"
              placeholder="smartphone"
            />
          </div>
          <div class="field">
            <label class="label">رنگ</label>
            <input
              class="input"
              dir="ltr"
              type="color"
              [(ngModel)]="form.color"
              name="color"
              style="height:42px"
            />
          </div>
          <div class="field">
            <label class="label">توضیح</label>
            <textarea
              class="textarea"
              rows="2"
              [(ngModel)]="form.description"
              name="description"
            ></textarea>
          </div>
          <div class="field">
            <label class="label">ترتیب نمایش</label>
            <input class="input" type="number" [(ngModel)]="form.order" name="order" />
          </div>
          <label class="switch">
            <input type="checkbox" [(ngModel)]="form.isActive" name="isActive" />
            <span class="track"></span>
            فعال
          </label>
        </div>
        <div modalFooter>
          <button type="button" class="btn btn-ghost" (click)="editorOpen.set(false)">
            انصراف
          </button>
          <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="save()">
            ذخیره
          </button>
        </div>
      </app-modal>
    }

    <app-confirm-dialog
      [open]="confirmOpen()"
      title="حذف دستهبندی"
      [message]="'دستهبندی «' + (deleteTarget()?.name ?? '') + '» حذف میشود.'"
      [busy]="deleting()"
      (confirm)="performDelete()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
})
export class AdminProductCategoriesPage {
  private readonly shop = inject(ShopService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  protected readonly categories = signal<ProductCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly editing = signal<ProductCategory | null>(null);
  protected readonly deleteTarget = signal<ProductCategory | null>(null);

  protected form = {
    name: '',
    slug: '',
    icon: '',
    color: '#2563eb',
    description: '',
    order: 0,
    isActive: true,
  };

  constructor() {
    this.seo.set({ title: 'دستهبندی محصولات | پنل مدیریت' });
    this.load();
  }

  protected openEditor(category?: ProductCategory): void {
    this.editing.set(category ?? null);
    this.form = {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      icon: category?.icon ?? '',
      color: category?.color ?? '#2563eb',
      description: category?.description ?? '',
      order: category?.order ?? 0,
      isActive: category?.isActive ?? true,
    };
    this.editorOpen.set(true);
  }

  protected save(): void {
    if (!this.form.name.trim()) {
      this.toast.warning('نام دستهبندی الزامی است');
      return;
    }
    this.saving.set(true);
    const editing = this.editing();
    const request = editing
      ? this.shop.updateCategory(editing._id, this.form)
      : this.shop.createCategory(this.form);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.toast.success(editing ? 'دستهبندی بهروزرسانی شد' : 'دستهبندی ایجاد شد');
        this.load();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.error(error.message);
      },
    });
  }

  protected confirmDelete(category: ProductCategory): void {
    this.deleteTarget.set(category);
    this.confirmOpen.set(true);
  }

  protected performDelete(): void {
    const category = this.deleteTarget();
    if (!category) return;
    this.deleting.set(true);
    this.shop.removeCategory(category._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmOpen.set(false);
        this.toast.success('دستهبندی حذف شد');
        this.load();
      },
      error: (error: Error) => {
        this.deleting.set(false);
        this.toast.error(error.message);
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.shop.categories(true).subscribe({
      next: (categories) => {
        this.categories.set(categories ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
