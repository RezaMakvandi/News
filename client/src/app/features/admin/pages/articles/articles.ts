import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ArticleService, type BulkAction } from '../../../../core/services/article.service';
import { CategoryService } from '../../../../core/services/taxonomy.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { Article } from '../../../../core/models/article.model';
import type { Category } from '../../../../core/models/taxonomy.model';
import { ARTICLE_STATUS_LABELS, ARTICLE_TYPE_LABELS } from '../../../../core/models/article.model';
import { FaDatePipe, FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import { categoryName } from '../../../../core/utils/relation';

const STATUS_TABS = [
  { value: 'all', label: 'همه' },
  { value: 'published', label: 'منتشر شده' },
  { value: 'pending', label: 'در انتظار تأیید' },
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'archived', label: 'بایگانی' },
];

@Component({
  selector: 'app-articles-page',
  imports: [
    RouterLink,
    FormsModule,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    ConfirmDialogComponent,
    FaDatePipe,
    FaNumberPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>اخبار و مقالات</h1>
        <p class="text-sm text-muted">مدیریت همه مطالب منتشر شده و در انتظار سایت.</p>
      </div>
      <a class="btn btn-primary" routerLink="/admin/articles/new">
        <app-icon name="plus-circle" [size]="18" />
        خبر جدید
      </a>
    </div>

    <div class="filter-bar">
      <div class="tabs">
        @for (tab of statusTabs; track tab.value) {
          <button
            type="button"
            class="btn btn-sm"
            [class.btn-primary]="status() === tab.value"
            [class.btn-ghost]="status() !== tab.value"
            (click)="setStatus(tab.value)"
          >
            {{ tab.label }}
            @if (statusCounts()[tab.value] !== undefined) {
              <span class="nav-count">{{ statusCounts()[tab.value] | faNumber }}</span>
            }
          </button>
        }
      </div>

      <div class="row wrap">
        <select class="select" [ngModel]="category()" (ngModelChange)="setCategory($event)">
          <option value="">همه دسته‌ها</option>
          @for (item of categories(); track item._id) {
            <option [value]="item._id">{{ item.name }}</option>
          }
        </select>

        <select class="select" [ngModel]="sort()" (ngModelChange)="setSort($event)">
          <option value="newest">جدیدترین</option>
          <option value="oldest">قدیمی‌ترین</option>
          <option value="views">پربازدیدترین</option>
          <option value="title">عنوان</option>
        </select>

        <div class="input-search">
          <app-icon name="search" [size]="16" />
          <input
            class="input"
            type="search"
            placeholder="جستجو در عنوان…"
            [ngModel]="searchTerm()" (ngModelChange)="onSearchInput()"
            (input)="onSearchInput()"
          />
        </div>
      </div>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری مطالب…" />
    } @else if (articles().length === 0) {
      <app-empty-state
        icon="file"
        title="مطلبی یافت نشد"
        description="فیلترها را تغییر دهید یا اولین خبر را ایجاد کنید."
        actionLabel="ایجاد خبر جدید"
        actionIcon="plus-circle"
        (action)="createNew()"
      />
    } @else {
      @if (selected().size) {
        <div class="bulk-bar">
          <span class="text-sm">{{ selected().size | faNumber }} مورد انتخاب شده</span>
          <div class="row">
            <button type="button" class="btn btn-success-soft btn-sm" (click)="bulk('publish')">
              <app-icon name="check-circle" [size]="16" />
              انتشار
            </button>
            <button type="button" class="btn btn-ghost btn-sm" (click)="bulk('archive')">
              <app-icon name="folder" [size]="16" />
              بایگانی
            </button>
            <button type="button" class="btn btn-ghost btn-sm" (click)="bulk('draft')">
              <app-icon name="edit" [size]="16" />
              پیش‌نویس
            </button>
            <button type="button" class="btn btn-danger-soft btn-sm" (click)="confirmBulkDelete()">
              <app-icon name="trash" [size]="16" />
              حذف
            </button>
            <button type="button" class="btn btn-ghost btn-sm" (click)="clearSelection()">لغو</button>
          </div>
        </div>
      }

      <div class="table-wrap card">
        <table class="table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  class="checkbox"
                  [checked]="allSelected()"
                  (change)="toggleAll($event)"
                  aria-label="انتخاب همه"
                />
              </th>
              <th>عنوان</th>
              <th>دسته‌بندی</th>
              <th>وضعیت</th>
              <th>بازدید</th>
              <th>تاریخ</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            @for (article of articles(); track article._id) {
              <tr>
                <td>
                  <input
                    type="checkbox"
                    class="checkbox"
                    [checked]="selected().has(article._id)"
                    (change)="toggleRow(article._id, $event)"
                    [attr.aria-label]="'انتخاب ' + article.title"
                  />
                </td>
                <td>
                  <div class="cell-article">
                    @if (article.cover) {
                      <img class="cell-thumb" [src]="article.cover" [alt]="article.coverAlt || article.title" loading="lazy" />
                    } @else {
                      <span class="cell-thumb cell-thumb-empty">
                        <app-icon [name]="typeIcon(article.type)" [size]="16" />
                      </span>
                    }
                    <div>
                      <a class="clamp-2 row-title" [routerLink]="['/news', article.slug]" target="_blank">
                        {{ article.title }}
                      </a>
                      <span class="text-xs text-faint">
                        {{ typeLabel(article.type) }}
                        @if (article.isPinned) {
                          · <app-icon name="star" [size]="11" /> سنجاق‌شده
                        }
                        @if (article.isBreaking) {
                          · فوری
                        }
                      </span>
                    </div>
                  </div>
                </td>
                <td>{{ categoryName(article.category) || '—' }}</td>
                <td>
                  <span class="badge" [class]="statusBadge(article.status)">
                    {{ statusLabel(article.status) }}
                  </span>
                </td>
                <td class="text-sm">{{ article.views | faNumber }}</td>
                <td class="text-sm text-muted">{{ article.createdAt | faDate: 'short' }}</td>
                <td class="col-actions">
                  <div class="row-actions">
                    <a class="btn btn-ghost btn-icon btn-sm" [routerLink]="['/admin/articles', article._id, 'edit']" aria-label="ویرایش">
                      <app-icon name="edit" [size]="16" />
                    </a>
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon btn-sm is-danger"
                      (click)="confirmDelete(article)"
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
      [title]="confirmTitle()"
      [message]="confirmMessage()"
      [busy]="actionBusy()"
      (confirm)="performDelete()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
  styles: `
    .cell-thumb {
      width: 52px;
      height: 38px;
      flex: none;
      border-radius: var(--radius-xs);
      object-fit: cover;
      display: grid;
      place-items: center;
      background: var(--bg-inset);
      color: var(--text-faint);
    }

    .filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      flex-wrap: wrap;
      margin-bottom: var(--space-4);
    }

    .filter-bar .select {
      width: auto;
      min-width: 150px;
    }

    .filter-bar .input-search {
      min-width: 220px;
    }
  `,
})
export class ArticlesPage {
  private readonly articleService = inject(ArticleService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly statusTabs = STATUS_TABS;

  protected readonly articles = signal<Article[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly statusCounts = signal<Record<string, number>>({});

  protected readonly status = signal('all');
  protected readonly category = signal('');
  protected readonly sort = signal('newest');
  protected readonly searchTerm = signal('');

  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly allSelected = computed(() => {
    const list = this.articles();
    return list.length > 0 && list.every((item) => this.selected().has(item._id));
  });

  protected readonly confirmOpen = signal(false);
  protected readonly actionBusy = signal(false);
  private pendingDelete = signal<Article | null>(null);
  private pendingBulkDelete = signal(false);

  protected readonly confirmTitle = computed(() =>
    this.pendingBulkDelete() ? 'حذف گروهی مطالب' : 'حذف مطلب',
  );
  protected readonly confirmMessage = computed(() => {
    if (this.pendingBulkDelete()) {
      return `${this.selected().size} مطلب انتخاب شده برای همیشه حذف می‌شود.`;
    }
    const article = this.pendingDelete();
    return article ? `«${article.title}» برای همیشه حذف خواهد شد.` : '';
  });

  constructor() {
    this.seo.set({ title: 'مدیریت اخبار | پنل مدیریت' });
    this.loadCategories();
    this.load();
  }

  protected setStatus(value: string): void {
    this.status.set(value);
    this.page.set(1);
    this.clearSelection();
    this.load();
  }

  protected setCategory(value: string): void {
    this.category.set(value);
    this.page.set(1);
    this.clearSelection();
    this.load();
  }

  protected setSort(value: string): void {
    this.sort.set(value);
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

  protected toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selected.set(checked ? new Set(this.articles().map((item) => item._id)) : new Set());
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected confirmDelete(article: Article): void {
    this.pendingDelete.set(article);
    this.pendingBulkDelete.set(false);
    this.confirmOpen.set(true);
  }

  protected confirmBulkDelete(): void {
    this.pendingBulkDelete.set(true);
    this.confirmOpen.set(true);
  }

  protected performDelete(): void {
    this.actionBusy.set(true);

    const finish = (message: string) => {
      this.actionBusy.set(false);
      this.confirmOpen.set(false);
      this.clearSelection();
      this.toast.success(message);
      this.load();
    };

    const fail = () => this.actionBusy.set(false);

    if (this.pendingBulkDelete()) {
      this.articleService.bulk([...this.selected()], 'delete').subscribe({
        next: () => finish('مطالب انتخاب شده حذف شدند'),
        error: fail,
      });
      return;
    }

    const article = this.pendingDelete();
    if (!article) {
      fail();
      return;
    }

    this.articleService.remove(article._id).subscribe({
      next: () => finish('مطلب حذف شد'),
      error: fail,
    });
  }

  protected bulk(action: BulkAction): void {
    this.actionBusy.set(true);
    this.articleService.bulk([...this.selected()], action).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.clearSelection();
        this.toast.success('عملیات انجام شد');
        this.load();
      },
      error: () => this.actionBusy.set(false),
    });
  }

  protected createNew(): void {
    void this.router.navigateByUrl('/admin/articles/new');
  }

  protected statusLabel(status: string): string {
    return ARTICLE_STATUS_LABELS[status as keyof typeof ARTICLE_STATUS_LABELS] ?? status;
  }

  protected statusBadge(status: string): string {
    return (
      {
        published: 'badge badge-success',
        pending: 'badge badge-warning',
        draft: 'badge',
        archived: 'badge badge-danger',
      } as Record<string, string>
    )[status] ?? 'badge';
  }

  protected typeLabel(type: string): string {
    return ARTICLE_TYPE_LABELS[type as keyof typeof ARTICLE_TYPE_LABELS] ?? type;
  }

  protected typeIcon(type: string): string {
    return (
      {
        video: 'video',
        gallery: 'image',
        review: 'star',
      } as Record<string, string>
    )[type] ?? 'file';
  }

  protected categoryName = categoryName;

  private load(): void {
    this.loading.set(true);
    this.articleService
      .adminList({
        page: this.page(),
        limit: 20,
        status: this.status(),
        category: this.category(),
        sort: this.sort() as 'newest' | 'oldest' | 'views' | 'title',
        q: this.searchTerm().trim(),
      })
      .subscribe({
        next: (result) => {
          this.articles.set(result.items ?? []);
          this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
          this.statusCounts.set(result.meta?.statusCounts ?? {});
          this.loading.set(false);
        },
        error: () => {
          this.articles.set([]);
          this.loading.set(false);
        },
      });
  }

  private loadCategories(): void {
    this.categoryService.list(true).subscribe({
      next: (items) => this.categories.set(items),
    });
  }
}