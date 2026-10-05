import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { AdminService } from '../../../../core/services/admin.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { Subscriber } from '../../../../core/models/settings.model';
import { FaDatePipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-subscribers-page',
  imports: [
    FormsModule,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    ConfirmDialogComponent,
    FaDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>اعضای خبرنامه</h1>
        <p class="text-sm text-muted">مدیریت ایمیل‌های ثبت‌شده در خبرنامه.</p>
      </div>
      <div class="row">
        <button type="button" class="btn btn-outline" (click)="exportCsv()" [disabled]="!subscribers().length">
          <app-icon name="copy" [size]="16" />
          خروجی CSV
        </button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="tabs">
        <button type="button" class="btn btn-sm" [class.btn-primary]="active() === 'all'" [class.btn-ghost]="active() !== 'all'" (click)="setActive('all')">همه</button>
        <button type="button" class="btn btn-sm" [class.btn-primary]="active() === 'true'" [class.btn-ghost]="active() !== 'true'" (click)="setActive('true')">فعال</button>
        <button type="button" class="btn btn-sm" [class.btn-primary]="active() === 'false'" [class.btn-ghost]="active() !== 'false'" (click)="setActive('false')">غیرفعال</button>
      </div>

      <div class="input-search">
        <app-icon name="search" [size]="16" />
        <input
          class="input"
          type="search"
          placeholder="جستجو در ایمیل…"
          [ngModel]="searchTerm()" (ngModelChange)="onSearchInput()"
          (input)="onSearchInput()"
        />
      </div>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری اعضا…" />
    } @else if (!subscribers().length) {
      <app-empty-state
        icon="users"
        title="عضوی یافت نشد"
        description="هنوز کسی در خبرنامه عضو نشده است."
      />
    } @else {
      <div class="table-wrap card">
        <table class="table">
          <thead>
            <tr>
              <th>ایمیل</th>
              <th>وضعیت</th>
              <th>منبع</th>
              <th>تاریخ عضویت</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            @for (subscriber of subscribers(); track subscriber._id) {
              <tr>
                <td class="text-sm" dir="ltr">{{ subscriber.email }}</td>
                <td>
                  <span class="badge" [class]="subscriber.isActive ? 'badge badge-success' : 'badge'">
                    {{ subscriber.isActive ? 'فعال' : 'غیرفعال' }}
                  </span>
                </td>
                <td class="text-sm text-muted">{{ subscriber.source || 'فرم سایت' }}</td>
                <td class="text-sm text-muted">{{ subscriber.createdAt | faDate: 'short' }}</td>
                <td class="col-actions">
                  <div class="row-actions">
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      (click)="toggleActive(subscriber)"
                    >
                      {{ subscriber.isActive ? 'غیرفعال کردن' : 'فعال کردن' }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon btn-sm is-danger"
                      (click)="confirmDelete(subscriber)"
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

      <div class="row" style="justify-content: center; margin-top: var(--space-5)">
        <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="goToPage($event)" />
      </div>
    }

    <app-confirm-dialog
      [open]="confirmOpen()"
      title="حذف عضو"
      [message]="deleteMessage()"
      [busy]="deleting()"
      (confirm)="performDelete()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
})
export class SubscribersPage {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly loading = signal(true);
  protected readonly deleting = signal(false);
  protected readonly subscribers = signal<Subscriber[]>([]);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);

  protected readonly active = signal('all');
  protected readonly searchTerm = signal('');

  protected readonly confirmOpen = signal(false);
  protected readonly deleteTarget = signal<Subscriber | null>(null);

  constructor() {
    this.seo.set({ title: 'اعضای خبرنامه | پنل مدیریت' });
    this.load();
  }

  protected setActive(value: string): void {
    this.active.set(value);
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

  protected toggleActive(subscriber: Subscriber): void {
    this.adminService
      .updateSubscriber(subscriber._id, { isActive: !subscriber.isActive })
      .subscribe({
        next: (updated) => {
          this.toast.success('وضعیت عضو تغییر کرد');
          this.patchSubscriber(updated);
        },
        error: (error: Error) => this.toast.error(error.message || 'عملیات انجام نشد'),
      });
  }

  protected confirmDelete(subscriber: Subscriber): void {
    this.deleteTarget.set(subscriber);
    this.confirmOpen.set(true);
  }

  protected deleteMessage(): string {
    const subscriber = this.deleteTarget();
    return subscriber ? `ایمیل «${subscriber.email}» برای همیشه حذف می‌شود.` : '';
  }

  protected performDelete(): void {
    const subscriber = this.deleteTarget();
    if (!subscriber) return;

    this.deleting.set(true);
    this.adminService.deleteSubscriber(subscriber._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmOpen.set(false);
        this.toast.success('عضو حذف شد');
        this.load();
      },
      error: (error: Error) => {
        this.deleting.set(false);
        this.toast.error(error.message || 'حذف انجام نشد');
      },
    });
  }

  protected exportCsv(): void {
    const rows = [
      ['ایمیل', 'وضعیت', 'منبع', 'تاریخ عضویت'],
      ...this.subscribers().map((item) => [
        item.email,
        item.isActive ? 'فعال' : 'غیرفعال',
        item.source || 'فرم سایت',
        item.createdAt,
      ]),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'subscribers.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private load(): void {
    this.loading.set(true);
    this.adminService
      .subscribers({
        page: this.page(),
        limit: 30,
        active: this.active() === 'all' ? undefined : this.active(),
        q: this.searchTerm().trim(),
      })
      .subscribe({
        next: (result) => {
          this.subscribers.set(result.items ?? []);
          this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
          this.loading.set(false);
        },
        error: () => {
          this.subscribers.set([]);
          this.loading.set(false);
        },
      });
  }

  private patchSubscriber(updated: Subscriber): void {
    this.subscribers.update((list) => list.map((item) => (item._id === updated._id ? updated : item)));
  }
}