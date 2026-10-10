import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { OrderService } from '../../../../core/services/order.service';
import { SeoService } from '../../../../core/services/seo.service';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import type { ShopStatsCharts, ShopStatsOverview } from '../../../../core/models/order.model';

@Component({
  selector: 'app-shop-dashboard',
  imports: [RouterLink, IconComponent, SpinnerComponent, FaNumberPipe, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>داشبورد فروشگاه</h1>
        <p class="text-sm text-muted">نمای کلی فروش، سفارشها و عملکرد کاتالوگ.</p>
      </div>
      <a class="btn btn-soft" routerLink="/shop" target="_blank" rel="noopener">
        <app-icon name="globe" [size]="16" /> مشاهده فروشگاه
      </a>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری آمار فروشگاه..." />
    } @else if (overview(); as stats) {
      <div class="grid grid-4" style="margin-bottom:var(--space-5)">
        <div class="stat-card">
          <span class="stat-icon" style="background:var(--success-soft);color:var(--success)"
            ><app-icon name="wallet" [size]="22"
          /></span>
          <div>
            <span class="stat-value">{{ stats.revenue | faNumber }}</span>
            <span class="stat-label">درآمد کل (تومان)</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon" style="background:var(--accent-soft);color:var(--accent)"
            ><app-icon name="bag" [size]="22"
          /></span>
          <div>
            <span class="stat-value">{{ stats.orders.total | faNumber }}</span>
            <span class="stat-label">کل سفارشها</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon" style="background:var(--warning-soft);color:var(--warning)"
            ><app-icon name="clock" [size]="22"
          /></span>
          <div>
            <span class="stat-value">{{ stats.orders.pending | faNumber }}</span>
            <span class="stat-label">در انتظار پرداخت</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon" style="background:var(--info-soft);color:var(--info)"
            ><app-icon name="users" [size]="22"
          /></span>
          <div>
            <span class="stat-value">{{ stats.customers | faNumber }}</span>
            <span class="stat-label">مشتریان</span>
          </div>
        </div>
      </div>

      <div
        class="grid"
        style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:var(--space-4);align-items:start"
      >
        <!-- Sales chart -->
        <div class="card">
          <div class="card-head">
            <span class="card-title">فروش ۱۴ روز اخیر</span>
            <span class="text-xs text-muted">امروز: {{ stats.todayRevenue | faNumber }} تومان</span>
          </div>
          <div class="card-body">
            @if (charts(); as chart) {
              <div class="bar-chart">
                @for (point of chart.series; track point.date) {
                  <div class="bar-col" [title]="point.label + ': ' + point.revenue + ' تومان'">
                    <span class="bar-fill" [style.height.%]="barHeight(point.revenue)"></span>
                    <span class="bar-label">{{ point.label }}</span>
                  </div>
                }
              </div>
            } @else {
              <p class="text-muted">دادهای برای نمایش نیست.</p>
            }
          </div>
        </div>

        <!-- Top products -->
        <div class="card">
          <div class="card-head"><span class="card-title">پرفروشترین محصولات</span></div>
          <div class="card-body">
            @if (charts()?.topProducts?.length) {
              <div class="stack-sm">
                @for (product of charts()!.topProducts; track product._id) {
                  <div class="row" style="justify-content:space-between;gap:var(--space-2)">
                    <span class="text-sm clamp-1" style="flex:1">{{ product.name }}</span>
                    <span class="badge badge-accent">{{ product.quantity | faNumber }}</span>
                  </div>
                }
              </div>
            } @else {
              <p class="text-muted">هنوز فروشی ثبت نشده است.</p>
            }
          </div>
        </div>
      </div>

      <!-- Order status breakdown -->
      @if (charts(); as chart) {
        <div class="card" style="margin-top:var(--space-4)">
          <div class="card-head"><span class="card-title">وضعیت سفارشها</span></div>
          <div class="card-body">
            <div class="row" style="flex-wrap:wrap;gap:var(--space-3)">
              @for (entry of statusEntries(); track entry.key) {
                <div class="status-pill">
                  <span class="badge" [ngClass]="entry.tone">{{ entry.label }}</span>
                  <strong>{{ entry.count | faNumber }}</strong>
                </div>
              }
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: `
    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4);
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: var(--radius);
    }

    .stat-icon {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius);
      flex: none;
    }

    .stat-value {
      display: block;
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--text-strong);
    }

    .stat-label {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 180px;
    }

    .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      gap: 6px;
      height: 100%;
    }

    .bar-fill {
      width: 100%;
      min-height: 3px;
      border-radius: var(--radius-xs) var(--radius-xs) 0 0;
      background: linear-gradient(
        180deg,
        var(--accent),
        color-mix(in srgb, var(--accent) 55%, transparent)
      );
    }

    .bar-label {
      font-size: 0.62rem;
      color: var(--text-faint);
      white-space: nowrap;
    }

    .status-pill {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
  `,
})
export class ShopDashboardPage {
  private readonly orderService = inject(OrderService);
  private readonly seo = inject(SeoService);

  protected readonly overview = signal<ShopStatsOverview | null>(null);
  protected readonly charts = signal<ShopStatsCharts | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.seo.set({ title: 'داشبورد فروشگاه | پنل مدیریت' });

    this.orderService.statsOverview().subscribe({
      next: (data) => {
        this.overview.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.orderService.statsCharts().subscribe({
      next: (data) => this.charts.set(data),
      error: () => undefined,
    });
  }

  protected readonly statusEntries = computed(() => {
    const breakdown = this.charts()?.statusBreakdown ?? {};
    const labels: Record<string, string> = {
      pending: 'در انتظار پرداخت',
      paid: 'پرداخت شده',
      processing: 'در حال پردازش',
      shipped: 'ارسال شده',
      delivered: 'تحویل شده',
      cancelled: 'لغو شده',
      refunded: 'مرجوع شده',
      failed: 'ناموفق',
    };
    const tones: Record<string, string> = {
      pending: 'badge badge-warning',
      paid: 'badge badge-success',
      processing: 'badge badge-info',
      shipped: 'badge badge-info',
      delivered: 'badge badge-success',
      cancelled: 'badge badge-danger',
      refunded: 'badge badge-danger',
      failed: 'badge badge-danger',
    };
    return Object.entries(breakdown).map(([key, count]) => ({
      key,
      count,
      label: labels[key] ?? key,
      tone: tones[key] ?? 'badge',
    }));
  });

  protected barHeight(revenue: number): number {
    const max = Math.max(...(this.charts()?.series ?? []).map((point) => point.revenue), 1);
    return Math.max(3, (revenue / max) * 100);
  }
}
