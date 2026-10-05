import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { AdminService } from '../../../../core/services/admin.service';
import { SeoService } from '../../../../core/services/seo.service';
import type { RecentActivity, StatsCharts, StatsOverview } from '../../../../core/models/stats.model';
import { FaDatePipe, FaNumberPipe } from '../../../../shared/pipes/format.pipe';

interface StatDef {
  key: string;
  label: string;
  icon: string;
  value: number;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, IconComponent, SpinnerComponent, FaDatePipe, FaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>داشبورد</h1>
        <p class="text-sm text-muted">نمای کلی عملکرد سایت در یک نگاه.</p>
      </div>
      <a class="btn btn-primary" routerLink="/admin/articles/new">
        <app-icon name="plus-circle" [size]="18" />
        خبر جدید
      </a>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری آمار…" />
    } @else {
      <div class="stat-grid">
        @for (item of stats(); track item.key) {
          <div class="stat-card card">
            <span class="stat-card-icon">
              <app-icon [name]="item.icon" [size]="22" />
            </span>
            <div>
              <p class="stat-card-label">{{ item.label }}</p>
              <p class="stat-card-value">{{ item.value | faNumber }}</p>
            </div>
          </div>
        }
      </div>

      <div class="grid-2" style="margin-top: var(--space-5)">
        <div class="chart-card card card-pad">
          <div class="card-head">
            <h3 class="card-title">بازدید ۱۴ روز اخیر</h3>
          </div>
          @if (charts(); as data) {
            <div class="chart" role="img" aria-label="نمودار بازدید">
              @for (point of data.series; track point.date) {
                <span
                  class="chart-bar"
                  [style.height.%]="barHeight(point.views, data.series)"
                  [title]="point.label + ' — ' + (point.views | faNumber) + ' بازدید'"
                ></span>
              }
            </div>
            <div class="chart-legend">
              <span class="text-xs text-muted">
                {{ data.series[0]?.label }} تا {{ data.series[data.series.length - 1]?.label }}
              </span>
            </div>
          }
        </div>

        <div class="card card-pad">
          <div class="card-head">
            <h3 class="card-title">پربازدیدترین مطالب</h3>
          </div>
          @if (charts()?.topArticles?.length) {
            <div class="stack">
              @for (article of charts()!.topArticles.slice(0, 6); track article._id; let index = $index) {
                <a class="article-row" [routerLink]="['/news', article.slug]">
                  <span class="row-index">{{ index + 1 | faNumber }}</span>
                  <span class="row-title clamp-1">{{ article.title }}</span>
                  <span class="text-xs text-muted nowrap">
                    <app-icon name="eye" [size]="13" />
                    {{ article.views | faNumber }}
                  </span>
                </a>
              }
            </div>
          } @else {
            <p class="text-sm text-muted">هنوز مطلبی منتشر نشده است.</p>
          }
        </div>
      </div>

      <div class="grid-3" style="margin-top: var(--space-5)">
        <div class="card card-pad">
          <div class="card-head">
            <h3 class="card-title">آخرین مطالب</h3>
          </div>
          @if (recent()?.articles?.length) {
            <div class="stack">
              @for (article of recent()!.articles.slice(0, 5); track article._id) {
                <div class="mini-row">
                  <div>
                    <a class="clamp-1 row-title" [routerLink]="['/news', article.slug]">{{ article.title }}</a>
                    <span class="text-xs text-faint">{{ article.createdAt | faDate: 'relative' }}</span>
                  </div>
                  <span class="badge" [class]="statusBadge(article.status)">{{ statusLabel(article.status) }}</span>
                </div>
              }
            </div>
          } @else {
            <p class="text-sm text-muted">موردی یافت نشد.</p>
          }
        </div>

        <div class="card card-pad">
          <div class="card-head">
            <h3 class="card-title">نظرات در انتظار تأیید</h3>
          </div>
          @if (recent()?.comments?.length) {
            <div class="stack">
              @for (comment of recent()!.comments.slice(0, 5); track comment._id) {
                <div class="mini-row">
                  <div>
                    <p class="clamp-2 row-title">{{ comment.content }}</p>
                    <span class="text-xs text-faint">
                      {{ comment.authorName }}
                      @if (comment.article) {
                        — <a [routerLink]="['/news', comment.article.slug]" class="text-accent">{{ comment.article.title }}</a>
                      }
                    </span>
                  </div>
                </div>
              }
            </div>
            <a class="btn btn-ghost btn-sm btn-block" routerLink="/admin/comments">مدیریت نظرات</a>
          } @else {
            <p class="text-sm text-muted">نظر در انتظاری وجود ندارد.</p>
          }
        </div>

        <div class="card card-pad">
          <div class="card-head">
            <h3 class="card-title">پیام‌های خوانده‌نشده</h3>
          </div>
          @if (recent()?.messages?.length) {
            <div class="stack">
              @for (message of recent()!.messages.slice(0, 5); track message._id) {
                <div class="mini-row">
                  <div>
                    <p class="clamp-1 row-title">{{ message.subject }}</p>
                    <span class="text-xs text-faint">{{ message.name }} — {{ message.createdAt | faDate: 'relative' }}</span>
                  </div>
                </div>
              }
            </div>
            <a class="btn btn-ghost btn-sm btn-block" routerLink="/admin/messages">مشاهده پیام‌ها</a>
          } @else {
            <p class="text-sm text-muted">پیام جدیدی وجود ندارد.</p>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .stat-card-icon {
      width: 46px;
      height: 46px;
      flex: none;
      border-radius: var(--radius);
      background: var(--accent-soft);
      color: var(--accent);
      display: grid;
      place-items: center;
    }

    .stat-card-label {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin: 0 0 2px;
    }

    .stat-card-value {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
    }

    .chart {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 160px;
      padding-top: var(--space-4);
    }

    .chart-bar {
      flex: 1;
      min-height: 4px;
      border-radius: var(--radius-xs) var(--radius-xs) 0 0;
      background: var(--accent);
      opacity: 0.85;
      transition: opacity var(--transition-fast);
    }

    .chart-bar:hover {
      opacity: 1;
    }

    .mini-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .row-title {
      font-weight: 600;
      color: var(--text-strong);
    }

    .nowrap {
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  `,
})
export class DashboardPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);

  protected readonly loading = signal(true);
  protected readonly overview = signal<StatsOverview | null>(null);
  protected readonly charts = signal<StatsCharts | null>(null);
  protected readonly recent = signal<RecentActivity | null>(null);

  protected readonly stats = computed<StatDef[]>(() => {
    const data = this.overview();
    if (!data) return [];
    return [
      { key: 'articles', label: 'مطالب منتشر شده', icon: 'file', value: data.articles.published },
      { key: 'views', label: 'مجموع بازدیدها', icon: 'eye', value: data.views },
      { key: 'comments', label: 'نظر در انتظار', icon: 'comment', value: data.comments.pending },
      { key: 'users', label: 'کاربران', icon: 'users', value: data.users },
      { key: 'subscribers', label: 'اعضای خبرنامه', icon: 'mail', value: data.subscribers },
      { key: 'messages', label: 'پیام خوانده‌نشده', icon: 'bell', value: data.messages.unread },
    ];
  });

  constructor() {
    this.seo.set({ title: 'داشبورد | پنل مدیریت' });
    this.load();
  }

  protected barHeight(value: number, series: { views: number }[]): number {
    const max = Math.max(1, ...series.map((point) => point.views));
    return Math.max(4, Math.round((value / max) * 100));
  }

  protected statusLabel(status: string): string {
    return (
      {
        published: 'منتشر شده',
        pending: 'در انتظار',
        draft: 'پیش‌نویس',
        archived: 'بایگانی',
      } as Record<string, string>
    )[status] ?? status;
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

  private load(): void {
    let pending = 3;
    const done = () => {
      pending -= 1;
      if (pending === 0) this.loading.set(false);
    };

    this.admin.overview().subscribe({ next: (value) => { this.overview.set(value); done(); }, error: done });
    this.admin.charts().subscribe({ next: (value) => { this.charts.set(value); done(); }, error: done });
    this.admin.recent().subscribe({ next: (value) => { this.recent.set(value); done(); }, error: done });
  }
}