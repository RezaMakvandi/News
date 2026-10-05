import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { AdminService } from '../../../../core/services/admin.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { ContactMessage, MessageStatus } from '../../../../core/models/settings.model';
import { MESSAGE_STATUS_LABELS, MESSAGE_STATUS_TONE } from '../../../../core/models/settings.model';
import { FaDatePipe, FaNumberPipe } from '../../../../shared/pipes/format.pipe';

const STATUS_TABS = [
  { value: 'unread', label: 'خوانده نشده' },
  { value: 'read', label: 'خوانده شده' },
  { value: 'replied', label: 'پاسخ داده شده' },
  { value: 'archived', label: 'بایگانی' },
  { value: 'all', label: 'همه' },
];

@Component({
  selector: 'app-messages-page',
  imports: [
    FormsModule,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    ConfirmDialogComponent,
    ModalComponent,
    FaDatePipe,
    FaNumberPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>پیام‌های تماس</h1>
        <p class="text-sm text-muted">مدیریت پیام‌های ارسال‌شده از فرم تماس.</p>
      </div>
    </div>

    <div class="filter-bar">
      <div class="tabs">
        @for (tab of statusTabs; track tab.value) {
          <button
            type="button"
            class="btn btn-sm"
            [class.btn-primary]="status() === tab.value"
            [class.btn-ghost]="status() !== tab.value"
            (click)="setTab(tab.value)"
          >
            {{ tab.label }}
            @if (statusCounts()[tab.value] !== undefined) {
              <span class="nav-count">{{ statusCounts()[tab.value] | faNumber }}</span>
            }
          </button>
        }
      </div>

      <div class="input-search">
        <app-icon name="search" [size]="16" />
        <input
          class="input"
          type="search"
          placeholder="جستجو در پیام‌ها…"
          [ngModel]="searchTerm()" (ngModelChange)="onSearchInput()"
          (input)="onSearchInput()"
        />
      </div>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری پیام‌ها…" />
    } @else if (!messages().length) {
      <app-empty-state
        icon="mail"
        title="پیامی یافت نشد"
        description="پیام جدیدی در این وضعیت وجود ندارد."
      />
    } @else {
      <div class="stack">
        @for (message of messages(); track message._id) {
          <div class="card card-pad">
            <div class="row wrap" style="gap: var(--space-2); align-items: center">
              <strong>{{ message.name }}</strong>
              <span class="text-xs text-faint" dir="ltr">{{ message.email }}</span>
              <span class="badge" [class]="statusBadge(message.status)">{{ statusLabel(message.status) }}</span>
            </div>

            <h4 style="margin: var(--space-2) 0">{{ message.subject }}</h4>
            <p class="text-sm text-muted">{{ message.body }}</p>

            @if (message.reply) {
              <div class="comment-admin-reply">
                <span class="reply-label">پاسخ شما:</span>
                {{ message.reply }}
              </div>
            }

            <div class="row wrap" style="gap: var(--space-2); margin-top: var(--space-3)">
              <span class="text-xs text-faint">{{ message.createdAt | faDate: 'relative' }}</span>

              <div class="grow"></div>

              <div class="row">
                @if (message.status === 'unread') {
                  <button type="button" class="btn btn-ghost btn-sm" (click)="setStatus(message, 'read')">
                    <app-icon name="check" [size]="14" />
                    خوانده شد
                  </button>
                }
                <button type="button" class="btn btn-primary btn-sm" (click)="openReply(message)">
                  <app-icon name="send" [size]="14" />
                  پاسخ
                </button>
                <button type="button" class="btn btn-ghost btn-sm" (click)="setStatus(message, 'archived')">
                  <app-icon name="folder" [size]="14" />
                  بایگانی
                </button>
                <button type="button" class="btn btn-ghost btn-icon btn-sm is-danger" (click)="confirmDelete(message)" aria-label="حذف">
                  <app-icon name="trash" [size]="14" />
                </button>
              </div>
            </div>
          </div>
        }
      </div>

      <div class="row" style="justify-content: center; margin-top: var(--space-5)">
        <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="goToPage($event)" />
      </div>
    }

    @if (replyOpen()) {
      <app-modal [open]="true" title="پاسخ به پیام" (closed)="replyOpen.set(false)">
        <div class="stack-lg">
          <div class="text-sm">
            <strong>{{ replyingTo()?.name }}</strong>
            <p class="text-muted" style="margin-top: var(--space-1)">{{ replyingTo()?.body }}</p>
          </div>

          <div class="field">
            <label class="label">متن پاسخ</label>
            <textarea class="textarea" rows="6" [(ngModel)]="replyText" name="replyText"></textarea>
          </div>
        </div>

        <div modalFooter>
          <button type="button" class="btn btn-ghost" (click)="replyOpen.set(false)">انصراف</button>
          <button type="button" class="btn btn-primary" (click)="submitReply()" [disabled]="replyBusy()">
            @if (replyBusy()) {
              <span class="spinner spinner-sm"></span>
            }
            ارسال پاسخ
          </button>
        </div>
      </app-modal>
    }

    <app-confirm-dialog
      [open]="confirmOpen()"
      title="حذف پیام"
      [message]="deleteMessage()"
      [busy]="deleting()"
      (confirm)="performDelete()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
})
export class MessagesPage {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly statusTabs = STATUS_TABS;

  protected readonly messages = signal<ContactMessage[]>([]);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly statusCounts = signal<Record<string, number>>({});

  protected readonly status = signal('unread');
  protected readonly searchTerm = signal('');

  protected readonly replyOpen = signal(false);
  protected readonly replyBusy = signal(false);
  protected readonly replyingTo = signal<ContactMessage | null>(null);
  protected replyText = '';

  protected readonly confirmOpen = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteTarget = signal<ContactMessage | null>(null);

  constructor() {
    this.seo.set({ title: 'پیام‌های تماس | پنل مدیریت' });
    this.load();
  }

  protected setTab(value: string): void {
    this.status.set(value);
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

  protected setStatus(message: ContactMessage, status: MessageStatus): void {
    this.adminService.updateMessage(message._id, { status }).subscribe({
      next: (updated) => {
        this.toast.success('وضعیت پیام تغییر کرد');
        this.patchMessage(updated);
      },
      error: (error: Error) => this.toast.error(error.message || 'عملیات انجام نشد'),
    });
  }

  protected openReply(message: ContactMessage): void {
    this.replyingTo.set(message);
    this.replyText = message.reply ?? '';
    this.replyOpen.set(true);
  }

  protected submitReply(): void {
    const message = this.replyingTo();
    if (!message || !this.replyText.trim()) return;

    this.replyBusy.set(true);
    this.adminService.updateMessage(message._id, { reply: this.replyText.trim(), status: 'replied' }).subscribe({
      next: (updated) => {
        this.replyBusy.set(false);
        this.replyOpen.set(false);
        this.toast.success('پاسخ ثبت شد');
        this.patchMessage(updated);
      },
      error: (error: Error) => {
        this.replyBusy.set(false);
        this.toast.error(error.message || 'ارسال پاسخ انجام نشد');
      },
    });
  }

  protected confirmDelete(message: ContactMessage): void {
    this.deleteTarget.set(message);
    this.confirmOpen.set(true);
  }

  protected deleteMessage(): string {
    const message = this.deleteTarget();
    return message ? `پیام «${message.subject}» برای همیشه حذف می‌شود.` : '';
  }

  protected performDelete(): void {
    const message = this.deleteTarget();
    if (!message) return;

    this.deleting.set(true);
    this.adminService.deleteMessage(message._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmOpen.set(false);
        this.toast.success('پیام حذف شد');
        this.load();
      },
      error: (error: Error) => {
        this.deleting.set(false);
        this.toast.error(error.message || 'حذف انجام نشد');
      },
    });
  }

  protected statusLabel(status: MessageStatus): string {
    return MESSAGE_STATUS_LABELS[status] ?? status;
  }

  protected statusBadge(status: MessageStatus): string {
    return MESSAGE_STATUS_TONE[status] ?? 'badge';
  }

  private load(): void {
    this.loading.set(true);
    this.adminService
      .messages({
        page: this.page(),
        limit: 20,
        status: this.status() === 'all' ? undefined : this.status(),
        q: this.searchTerm().trim(),
      })
      .subscribe({
        next: (result) => {
          this.messages.set(result.items ?? []);
          this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
          this.statusCounts.set(result.meta?.unread ? { unread: result.meta.unread } : {});
          this.loading.set(false);
        },
        error: () => {
          this.messages.set([]);
          this.loading.set(false);
        },
      });
  }

  private patchMessage(updated: ContactMessage): void {
    this.messages.update((list) => list.map((item) => (item._id === updated._id ? updated : item)));
  }
}