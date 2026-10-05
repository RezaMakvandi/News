import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { CommentService, type CommentBulkAction } from '../../../../core/services/comment.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { Comment, CommentStatus } from '../../../../core/models/comment.model';
import { COMMENT_STATUS_LABELS, COMMENT_STATUS_TONE } from '../../../../core/models/comment.model';
import { FaDatePipe, FaNumberPipe } from '../../../../shared/pipes/format.pipe';

const STATUS_TABS = [
  { value: 'pending', label: 'در انتظار تأیید' },
  { value: 'approved', label: 'تأیید شده' },
  { value: 'rejected', label: 'رد شده' },
  { value: 'spam', label: 'اسپم' },
  { value: 'all', label: 'همه' },
];

@Component({
  selector: 'app-comments-page',
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
        <h1>مدیریت نظرات</h1>
        <p class="text-sm text-muted">تأیید، رد یا پاسخ به نظرات خوانندگان.</p>
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
          placeholder="جستجو در نظرات…"
          [ngModel]="searchTerm()" (ngModelChange)="onSearchInput()"
          (input)="onSearchInput()"
        />
      </div>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری نظرات…" />
    } @else if (!comments().length) {
      <app-empty-state
        icon="comment"
        title="نظری یافت نشد"
        description="فیلترها را تغییر دهید یا منتظر ثبت نظر جدید باشید."
      />
    } @else {
      @if (selected().size) {
        <div class="bulk-bar">
          <span class="text-sm">{{ selected().size | faNumber }} نظر انتخاب شده</span>
          <div class="row">
            <button type="button" class="btn btn-success-soft btn-sm" (click)="bulk('approve')">
              <app-icon name="check-circle" [size]="16" />
              تأیید
            </button>
            <button type="button" class="btn btn-ghost btn-sm" (click)="bulk('reject')">
              <app-icon name="x-circle" [size]="16" />
              رد
            </button>
            <button type="button" class="btn btn-ghost btn-sm" (click)="bulk('spam')">
              <app-icon name="warning" [size]="16" />
              اسپم
            </button>
            <button type="button" class="btn btn-danger-soft btn-sm" (click)="confirmBulkDelete()">
              <app-icon name="trash" [size]="16" />
              حذف
            </button>
            <button type="button" class="btn btn-ghost btn-sm" (click)="clearSelection()">لغو</button>
          </div>
        </div>
      }

      <div class="stack">
        @for (comment of comments(); track comment._id) {
          <div class="card card-pad">
            <div class="comment-head">
              <div class="row" style="flex: 1; gap: var(--space-2); flex-wrap: wrap; align-items: center">
                <strong class="comment-author">{{ comment.authorName }}</strong>
                <span class="text-xs text-faint" dir="ltr">{{ comment.authorEmail }}</span>
                <span class="badge" [class]="statusBadge(comment.status)">{{ statusLabel(comment.status) }}</span>
              </div>
              <input
                type="checkbox"
                class="checkbox"
                [checked]="selected().has(comment._id)"
                (change)="toggleRow(comment._id, $event)"
                aria-label="انتخاب نظر"
              />
            </div>

            <p class="comment-text">{{ comment.content }}</p>

            @if (comment.adminReply) {
              <div class="comment-admin-reply">
                <span class="reply-label">پاسخ مدیر:</span>
                {{ comment.adminReply }}
              </div>
            }

            <div class="comment-actions">
              <span class="text-xs text-faint">{{ comment.createdAt | faDate: 'relative' }}</span>
              @if (commentArticle(comment)) {
                <a class="text-xs text-accent" [href]="'/news/' + commentArticleSlug(comment)" target="_blank">
                  {{ commentArticle(comment) }}
                </a>
              }

              <div class="grow"></div>

              <div class="row">
                @if (comment.status === 'pending') {
                  <button type="button" class="btn btn-success-soft btn-sm" (click)="setStatus(comment, 'approved')">
                    <app-icon name="check-circle" [size]="14" />
                    تأیید
                  </button>
                  <button type="button" class="btn btn-danger-soft btn-sm" (click)="setStatus(comment, 'rejected')">
                    <app-icon name="x-circle" [size]="14" />
                    رد
                  </button>
                }

                <button type="button" class="btn btn-ghost btn-sm" (click)="openReply(comment)">
                  <app-icon name="comment" [size]="14" />
                  پاسخ
                </button>
                <button type="button" class="btn btn-ghost btn-sm" (click)="openEdit(comment)">
                  <app-icon name="edit" [size]="14" />
                  ویرایش
                </button>
                <button type="button" class="btn btn-ghost btn-icon btn-sm is-danger" (click)="confirmDelete(comment)" aria-label="حذف">
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
      <app-modal [open]="true" title="پاسخ به نظر" (closed)="replyOpen.set(false)">
        <div class="stack-lg">
          <p class="text-sm text-muted">{{ replyingTo()?.content }}</p>
          <div class="field">
            <label class="label">متن پاسخ</label>
            <textarea class="textarea" rows="5" [(ngModel)]="replyText" name="replyText"></textarea>
          </div>
          <div class="field">
            <label class="label">وضعیت نظر پس از پاسخ</label>
            <select class="select" [(ngModel)]="replyStatus" name="replyStatus">
              <option value="approved">تأیید شده</option>
              <option value="pending">در انتظار تأیید</option>
              <option value="rejected">رد شده</option>
            </select>
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

    @if (editOpen()) {
      <app-modal [open]="true" title="ویرایش نظر" (closed)="editOpen.set(false)">
        <div class="field">
          <label class="label">متن نظر</label>
          <textarea class="textarea" rows="6" [(ngModel)]="editText" name="editText"></textarea>
        </div>

        <div modalFooter>
          <button type="button" class="btn btn-ghost" (click)="editOpen.set(false)">انصراف</button>
          <button type="button" class="btn btn-primary" (click)="submitEdit()" [disabled]="editBusy()">
            @if (editBusy()) {
              <span class="spinner spinner-sm"></span>
            }
            ذخیره تغییرات
          </button>
        </div>
      </app-modal>
    }

    <app-confirm-dialog
      [open]="confirmOpen()"
      title="حذف نظر"
      [message]="deleteMessage()"
      [busy]="actionBusy()"
      (confirm)="performDelete()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
})
export class CommentsPage {
  private readonly commentService = inject(CommentService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly statusTabs = STATUS_TABS;

  protected readonly comments = signal<Comment[]>([]);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly statusCounts = signal<Record<string, number>>({});

  protected readonly status = signal('pending');
  protected readonly searchTerm = signal('');

  protected readonly selected = signal<Set<string>>(new Set());

  protected readonly confirmOpen = signal(false);
  protected readonly actionBusy = signal(false);
  private pendingDelete = signal<Comment | null>(null);
  private pendingBulkDelete = signal(false);

  protected readonly replyOpen = signal(false);
  protected readonly replyBusy = signal(false);
  protected readonly replyingTo = signal<Comment | null>(null);
  protected replyText = '';
  protected replyStatus: CommentStatus = 'approved';

  protected readonly editOpen = signal(false);
  protected readonly editBusy = signal(false);
  protected readonly editing = signal<Comment | null>(null);
  protected editText = '';

  constructor() {
    this.seo.set({ title: 'مدیریت نظرات | پنل مدیریت' });
    this.load();
  }

  protected setTab(value: string): void {
    this.status.set(value);
    this.page.set(1);
    this.clearSelection();
    this.load();
  }

  protected onSearchInput(): void {
    this.page.set(1);
    this.clearSelection();
    this.load();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected toggleRow(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selected());
    if (checked) next.add(id);
    else next.delete(id);
    this.selected.set(next);
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected setStatus(comment: Comment, status: CommentStatus): void {
    this.commentService.updateStatus(comment._id, status).subscribe({
      next: (updated) => {
        this.toast.success('وضعیت نظر تغییر کرد');
        this.patchComment(updated);
      },
      error: (error: Error) => this.toast.error(error.message || 'عملیات انجام نشد'),
    });
  }

  protected bulk(action: CommentBulkAction): void {
    this.actionBusy.set(true);
    this.commentService.bulk([...this.selected()], action).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.clearSelection();
        this.toast.success('عملیات انجام شد');
        this.load();
      },
      error: () => this.actionBusy.set(false),
    });
  }

  protected openReply(comment: Comment): void {
    this.replyingTo.set(comment);
    this.replyText = comment.adminReply ?? '';
    this.replyStatus = comment.status === 'pending' ? 'approved' : comment.status;
    this.replyOpen.set(true);
  }

  protected submitReply(): void {
    const comment = this.replyingTo();
    if (!comment || !this.replyText.trim()) return;

    this.replyBusy.set(true);
    this.commentService.reply(comment._id, this.replyText.trim(), this.replyStatus).subscribe({
      next: (updated) => {
        this.replyBusy.set(false);
        this.replyOpen.set(false);
        this.toast.success('پاسخ ثبت شد');
        this.patchComment(updated);
      },
      error: (error: Error) => {
        this.replyBusy.set(false);
        this.toast.error(error.message || 'ارسال پاسخ انجام نشد');
      },
    });
  }

  protected openEdit(comment: Comment): void {
    this.editing.set(comment);
    this.editText = comment.content;
    this.editOpen.set(true);
  }

  protected submitEdit(): void {
    const comment = this.editing();
    if (!comment || !this.editText.trim()) return;

    this.editBusy.set(true);
    this.commentService.update(comment._id, this.editText.trim()).subscribe({
      next: (updated) => {
        this.editBusy.set(false);
        this.editOpen.set(false);
        this.toast.success('نظر ویرایش شد');
        this.patchComment(updated);
      },
      error: (error: Error) => {
        this.editBusy.set(false);
        this.toast.error(error.message || 'ویرایش انجام نشد');
      },
    });
  }

  protected confirmDelete(comment: Comment): void {
    this.pendingDelete.set(comment);
    this.pendingBulkDelete.set(false);
    this.confirmOpen.set(true);
  }

  protected confirmBulkDelete(): void {
    this.pendingBulkDelete.set(true);
    this.confirmOpen.set(true);
  }

  protected deleteMessage(): string {
    if (this.pendingBulkDelete()) {
      return `${this.selected().size} نظر انتخاب شده برای همیشه حذف می‌شود.`;
    }
    const comment = this.pendingDelete();
    return comment ? `نظر «${comment.authorName}» برای همیشه حذف می‌شود.` : '';
  }

  protected performDelete(): void {
    this.actionBusy.set(true);

    const finish = () => {
      this.actionBusy.set(false);
      this.confirmOpen.set(false);
      this.clearSelection();
      this.toast.success('نظر حذف شد');
      this.load();
    };

    const fail = () => this.actionBusy.set(false);

    if (this.pendingBulkDelete()) {
      this.commentService.bulk([...this.selected()], 'delete').subscribe({
        next: finish,
        error: fail,
      });
      return;
    }

    const comment = this.pendingDelete();
    if (!comment) {
      fail();
      return;
    }

    this.commentService.remove(comment._id).subscribe({
      next: finish,
      error: fail,
    });
  }

  protected statusLabel(status: CommentStatus): string {
    return COMMENT_STATUS_LABELS[status] ?? status;
  }

  protected statusBadge(status: CommentStatus): string {
    return COMMENT_STATUS_TONE[status] ?? 'badge';
  }

  protected commentArticle(comment: Comment): string {
    return typeof comment.article === 'object' ? comment.article.title : '';
  }

  protected commentArticleSlug(comment: Comment): string {
    return typeof comment.article === 'object' ? comment.article.slug : '';
  }

  private load(): void {
    this.loading.set(true);
    this.commentService
      .adminList({
        page: this.page(),
        limit: 20,
        status: this.status() === 'all' ? undefined : this.status(),
        q: this.searchTerm().trim(),
      })
      .subscribe({
        next: (result) => {
          this.comments.set(result.items ?? []);
          this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
          this.statusCounts.set(result.meta?.statusCounts ?? {});
          this.loading.set(false);
        },
        error: () => {
          this.comments.set([]);
          this.loading.set(false);
        },
      });
  }

  private patchComment(updated: Comment): void {
    this.comments.update((list) => list.map((item) => (item._id === updated._id ? updated : item)));
  }
}