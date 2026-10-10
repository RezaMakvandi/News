import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { OrderService } from '../../../../core/services/order.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import type { Coupon, CouponPayload } from '../../../../core/models/order.model';

@Component({
  selector: 'app-admin-coupons',
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
        <h1>کدهای تخفیف</h1>
        <p class="text-sm text-muted">مدیریت کوپنها و تخفیفهای فروشگاه.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="openEditor()">
        <app-icon name="plus-circle" [size]="18" /> کد تخفیف جدید
      </button>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری کوپنها..." />
    } @else if (!coupons().length) {
      <app-empty-state
        icon="ticket"
        title="کد تخفیفی یافت نشد"
        description="اولین کد تخفیف را ایجاد کنید."
        actionLabel="ایجاد کوپن"
        actionIcon="plus-circle"
        (action)="openEditor()"
      />
    } @else {
      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>کد</th>
                <th>نوع</th>
                <th>مقدار</th>
                <th>حداقل سفارش</th>
                <th>استفاده</th>
                <th>وضعیت</th>
                <th style="width:130px">عملیات</th>
              </tr>
            </thead>
            <tbody>
              @for (coupon of coupons(); track coupon._id) {
                <tr>
                  <td>
                    <strong dir="ltr">{{ coupon.code }}</strong>
                    @if (coupon.description) {
                      <p class="text-xs text-muted">{{ coupon.description }}</p>
                    }
                  </td>
                  <td>{{ coupon.type === 'percent' ? 'درصدی' : 'مبلغ ثابت' }}</td>
                  <td>
                    @if (coupon.type === 'percent') {
                      {{ coupon.amount | faNumber }}٪
                    } @else {
                      {{ coupon.amount | faNumber }} تومان
                    }
                  </td>
                  <td>{{ coupon.minOrder | faNumber }} تومان</td>
                  <td>
                    {{ coupon.usedCount | faNumber }}
                    @if (coupon.maxUses > 0) {
                      / {{ coupon.maxUses | faNumber }}
                    }
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-success]="coupon.isActive"
                      [class.badge-danger]="!coupon.isActive"
                    >
                      {{ coupon.isActive ? 'فعال' : 'غیرفعال' }}
                    </span>
                  </td>
                  <td>
                    <div class="row" style="gap:4px">
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon"
                        (click)="openEditor(coupon)"
                        aria-label="ویرایش"
                      >
                        <app-icon name="edit" [size]="16" />
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon"
                        (click)="confirmDelete(coupon)"
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
        [title]="editing()?._id ? 'ویرایش کد تخفیف' : 'کد تخفیف جدید'"
        (closed)="editorOpen.set(false)"
      >
        <div class="stack-lg">
          <div class="field">
            <label class="label">کد <span class="req">*</span></label>
            <input
              class="input"
              dir="ltr"
              [(ngModel)]="form.code"
              name="code"
              placeholder="SUMMER20"
              style="text-transform:uppercase"
            />
          </div>
          <div class="field">
            <label class="label">نوع تخفیف</label>
            <select class="select" [(ngModel)]="form.type" name="type">
              <option value="percent">درصدی</option>
              <option value="fixed">مبلغ ثابت (تومان)</option>
            </select>
          </div>
          <div class="field">
            <label class="label">{{
              form.type === 'percent' ? 'درصد تخفیف' : 'مبلغ تخفیف (تومان)'
            }}</label>
            <input class="input" type="number" [(ngModel)]="form.amount" name="amount" />
          </div>
          <div class="field">
            <label class="label">حداقل مبلغ سفارش (تومان)</label>
            <input class="input" type="number" [(ngModel)]="form.minOrder" name="minOrder" />
          </div>
          <div class="grid grid-2" style="gap:var(--space-3)">
            <div class="field">
              <label class="label">حداکثر استفاده (۰=نامحدود)</label>
              <input class="input" type="number" [(ngModel)]="form.maxUses" name="maxUses" />
            </div>
            <div class="field">
              <label class="label">محدودیت هر کاربر</label>
              <input
                class="input"
                type="number"
                [(ngModel)]="form.perUserLimit"
                name="perUserLimit"
              />
            </div>
          </div>
          <div class="field">
            <label class="label">توضیح</label>
            <input class="input" [(ngModel)]="form.description" name="description" />
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
      title="حذف کد تخفیف"
      [message]="'کد «' + (deleteTarget()?.code ?? '') + '» حذف میشود.'"
      [busy]="deleting()"
      (confirm)="performDelete()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
})
export class AdminCouponsPage {
  private readonly orders = inject(OrderService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  protected readonly coupons = signal<Coupon[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly editing = signal<Coupon | null>(null);
  protected readonly deleteTarget = signal<Coupon | null>(null);

  protected form: CouponPayload = {
    code: '',
    description: '',
    type: 'percent',
    amount: 10,
    minOrder: 0,
    maxUses: 0,
    perUserLimit: 1,
    isActive: true,
  };

  constructor() {
    this.seo.set({ title: 'کدهای تخفیف | پنل مدیریت' });
    this.load();
  }

  protected openEditor(coupon?: Coupon): void {
    this.editing.set(coupon ?? null);
    this.form = coupon
      ? {
          code: coupon.code,
          description: coupon.description ?? '',
          type: coupon.type,
          amount: coupon.amount,
          minOrder: coupon.minOrder,
          maxUses: coupon.maxUses,
          perUserLimit: coupon.perUserLimit,
          isActive: coupon.isActive,
        }
      : {
          code: '',
          description: '',
          type: 'percent',
          amount: 10,
          minOrder: 0,
          maxUses: 0,
          perUserLimit: 1,
          isActive: true,
        };
    this.editorOpen.set(true);
  }

  protected save(): void {
    if (!this.form.code.trim()) {
      this.toast.warning('کد تخفیف الزامی است');
      return;
    }
    if (!this.form.amount || this.form.amount <= 0) {
      this.toast.warning('مقدار تخفیف را وارد کنید');
      return;
    }
    if (this.form.type === 'percent' && this.form.amount > 100) {
      this.toast.warning('درصد تخفیف نمیتواند بیش از ۱۰۰ باشد');
      return;
    }

    this.saving.set(true);
    const editing = this.editing();
    const request = editing
      ? this.orders.updateCoupon(editing._id, this.form)
      : this.orders.createCoupon(this.form);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.toast.success(editing ? 'کد تخفیف بهروزرسانی شد' : 'کد تخفیف ایجاد شد');
        this.load();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.error(error.message);
      },
    });
  }

  protected confirmDelete(coupon: Coupon): void {
    this.deleteTarget.set(coupon);
    this.confirmOpen.set(true);
  }

  protected performDelete(): void {
    const coupon = this.deleteTarget();
    if (!coupon) return;
    this.deleting.set(true);
    this.orders.removeCoupon(coupon._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmOpen.set(false);
        this.toast.success('کد تخفیف حذف شد');
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
    this.orders.coupons(1, 100).subscribe({
      next: (result) => {
        this.coupons.set(result.items ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
