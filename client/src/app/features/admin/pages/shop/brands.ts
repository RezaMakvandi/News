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
import type { Brand } from '../../../../core/models/product.model';

@Component({
  selector: 'app-admin-brands',
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
        <h1>برندها</h1>
        <p class="text-sm text-muted">مدیریت برندهای محصولات فروشگاه.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="openEditor()">
        <app-icon name="plus-circle" [size]="18" /> برند جدید
      </button>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری برندها..." />
    } @else if (!brands().length) {
      <app-empty-state
        icon="store"
        title="برندی یافت نشد"
        description="اولین برند را ایجاد کنید."
        actionLabel="ایجاد برند"
        actionIcon="plus-circle"
        (action)="openEditor()"
      />
    } @else {
      <div class="grid grid-4">
        @for (brand of brands(); track brand._id) {
          <div class="card card-pad" style="text-align:center">
            @if (brand.logo) {
              <img
                [src]="brand.logo"
                [alt]="brand.name"
                style="width:64px;height:64px;object-fit:contain;margin-bottom:var(--space-2)"
              />
            } @else {
              <div
                class="tile-icon"
                style="margin:0 auto var(--space-2);display:grid;place-items:center;width:56px;height:56px;border-radius:var(--radius-full);background:var(--accent-soft);color:var(--accent)"
              >
                <app-icon name="store" [size]="26" />
              </div>
            }
            <strong>{{ brand.name }}</strong>
            @if (brand.country) {
              <p class="text-xs text-muted">{{ brand.country }}</p>
            }
            <p class="text-xs text-muted">{{ brand.productsCount || 0 | faNumber }} محصول</p>
            <div
              class="row"
              style="justify-content:center;gap:var(--space-2);margin-top:var(--space-3)"
            >
              <button type="button" class="btn btn-ghost btn-sm" (click)="openEditor(brand)">
                <app-icon name="edit" [size]="15" /> ویرایش
              </button>
              <button type="button" class="btn btn-ghost btn-sm" (click)="confirmDelete(brand)">
                <app-icon name="trash" [size]="15" /> حذف
              </button>
            </div>
          </div>
        }
      </div>
    }

    @if (editorOpen()) {
      <app-modal
        [open]="true"
        [title]="editing()?._id ? 'ویرایش برند' : 'برند جدید'"
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
            <label class="label">کشور</label>
            <input class="input" [(ngModel)]="form.country" name="country" />
          </div>
          <div class="field">
            <label class="label">لوگو (آدرس تصویر)</label>
            <input class="input" dir="ltr" [(ngModel)]="form.logo" name="logo" />
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
      title="حذف برند"
      [message]="'برند «' + (deleteTarget()?.name ?? '') + '» حذف میشود.'"
      [busy]="deleting()"
      (confirm)="performDelete()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
})
export class AdminBrandsPage {
  private readonly shop = inject(ShopService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  protected readonly brands = signal<Brand[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly editing = signal<Brand | null>(null);
  protected readonly deleteTarget = signal<Brand | null>(null);

  protected form = { name: '', slug: '', country: '', logo: '', description: '', isActive: true };

  constructor() {
    this.seo.set({ title: 'برندها | پنل مدیریت' });
    this.load();
  }

  protected openEditor(brand?: Brand): void {
    this.editing.set(brand ?? null);
    this.form = {
      name: brand?.name ?? '',
      slug: brand?.slug ?? '',
      country: brand?.country ?? '',
      logo: brand?.logo ?? '',
      description: brand?.description ?? '',
      isActive: brand?.isActive ?? true,
    };
    this.editorOpen.set(true);
  }

  protected save(): void {
    if (!this.form.name.trim()) {
      this.toast.warning('نام برند الزامی است');
      return;
    }
    this.saving.set(true);
    const editing = this.editing();
    const request = editing
      ? this.shop.updateBrand(editing._id, this.form)
      : this.shop.createBrand(this.form);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.toast.success(editing ? 'برند بهروزرسانی شد' : 'برند ایجاد شد');
        this.load();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.error(error.message);
      },
    });
  }

  protected confirmDelete(brand: Brand): void {
    this.deleteTarget.set(brand);
    this.confirmOpen.set(true);
  }

  protected performDelete(): void {
    const brand = this.deleteTarget();
    if (!brand) return;
    this.deleting.set(true);
    this.shop.removeBrand(brand._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmOpen.set(false);
        this.toast.success('برند حذف شد');
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
    this.shop.brands(true).subscribe({
      next: (brands) => {
        this.brands.set(brands ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
