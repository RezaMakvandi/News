import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { StarsComponent } from '../../../../shared/components/stars/stars';
import { OrderService } from '../../../../core/services/order.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaDatePipe } from '../../../../shared/pipes/format.pipe';
import type { ProductReview } from '../../../../core/models/product.model';

@Component({
  selector: 'app-admin-reviews',
  imports: [
    FormsModule,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    StarsComponent,
    FaDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>نظرات محصولات</h1>
        <p class="text-sm text-muted">بررسی و تأیید نظرات کاربران.</p>
      </div>
    </div>

    <div class="filter-bar">
      <select
        class="select"
        style="width:180px"
        [ngModel]="statusFilter()"
        (ngModelChange)="setStatus($event)"
      >
        <option value="all">همه نظرات</option>
        <option value="pending">در انتظار تأیید</option>
        <option value="approved">تأیید شده</option>
        <option value="rejected">رد شده</option>
      </select>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری نظرات..." />
    } @else if (!reviews().length) {
      <app-empty-state
        icon="comment"
        title="نظری یافت نشد"
        description="در این وضعیت نظری ثبت نشده است."
      />
    } @else {
      <div class="stack" style="gap:var(--space-3)">
        @for (review of reviews(); track review._id) {
          <div class="card card-pad">
            <div
              class="row"
              style="justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--space-3)"
            >
              <div>
                <div class="row" style="gap:var(--space-2)">
                  <strong>{{ review.user.name || 'کاربر' }}</strong>
                  <app-stars [value]="review.rating" [size]="13" />
                  @if (review.isVerifiedPurchase) {
                    <span class="badge badge-success">خرید تأییدشده</span>
                  }
                </div>
                <p class="text-xs text-muted">
                  {{ productName(review) }} • {{ review.createdAt | faDate: 'relative' }}
                </p>
              </div>
              <div class="row" style="gap:var(--space-2)">
                <span
                  class="badge"
                  [class.badge-success]="review.status === 'approved'"
                  [class.badge-warning]="review.status === 'pending'"
                  [class.badge-danger]="review.status === 'rejected'"
                >
                  {{ statusLabel(review.status) }}
                </span>
              </div>
            </div>

            @if (review.title) {
              <p style="font-weight:700;margin-top:var(--space-2)">{{ review.title }}</p>
            }
            <p class="text-sm" style="margin-top:4px;line-height:2">{{ review.comment }}</p>

            <div class="row" style="gap:var(--space-2);margin-top:var(--space-3)">
              @if (review.status !== 'approved') {
                <button
                  type="button"
                  class="btn btn-sm btn-success-soft"
                  (click)="setReviewStatus(review, 'approved')"
                >
                  <app-icon name="check" [size]="14" /> تأیید
                </button>
              }
              @if (review.status !== 'rejected') {
                <button
                  type="button"
                  class="btn btn-sm btn-danger-soft"
                  (click)="setReviewStatus(review, 'rejected')"
                >
                  <app-icon name="close" [size]="14" /> رد
                </button>
              }
              <button type="button" class="btn btn-sm btn-ghost" (click)="remove(review)">
                <app-icon name="trash" [size]="14" /> حذف
              </button>
            </div>
          </div>
        }
      </div>

      <div class="row" style="justify-content:center;margin-top:var(--space-4)">
        <app-pagination
          [page]="page()"
          [totalPages]="totalPages()"
          (pageChange)="goToPage($event)"
        />
      </div>
    }
  `,
})
export class AdminReviewsPage {
  private readonly orderService = inject(OrderService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  protected readonly reviews = signal<ProductReview[]>([]);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly statusFilter = signal('all');

  constructor() {
    this.seo.set({ title: 'نظرات محصولات | پنل مدیریت' });
    this.load();
  }

  protected statusLabel(status: string): string {
    return status === 'approved' ? 'تأیید شده' : status === 'pending' ? 'در انتظار' : 'رد شده';
  }

  protected productName(review: ProductReview): string {
    const product = review.product;
    return typeof product === 'object' && product ? product.name : 'محصول';
  }

  protected setStatus(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.load();
  }

  protected setReviewStatus(review: ProductReview, status: string): void {
    this.orderService.updateReviewStatus(review._id, status).subscribe({
      next: () => {
        this.toast.success('وضعیت نظر بهروزرسانی شد');
        this.load();
      },
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  protected remove(review: ProductReview): void {
    this.orderService.removeReview(review._id).subscribe({
      next: () => {
        this.toast.success('نظر حذف شد');
        this.load();
      },
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.orderService
      .adminReviews({ page: this.page(), limit: 20, status: this.statusFilter() })
      .subscribe({
        next: (result) => {
          this.reviews.set(result.items ?? []);
          this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
