import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon';
import { faNumber } from '../../../core/utils/format';

@Component({
  selector: 'app-pagination',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav class="pagination" aria-label="صفحه‌بندی">
        <button
          type="button"
          [disabled]="page() <= 1"
          (click)="go(page() - 1)"
          aria-label="صفحه قبلی"
        >
          <app-icon name="chevron-right" [size]="16" />
        </button>

        @for (item of pages(); track $index) {
          @if (item === '...') {
            <span class="ellipsis" aria-hidden="true">…</span>
          } @else {
            <button
              type="button"
              [class.is-active]="item === page()"
              [attr.aria-current]="item === page() ? 'page' : null"
              (click)="go(asNumber(item))"
            >
              {{ faNumber(asNumber(item)) }}
            </button>
          }
        }

        <button
          type="button"
          [disabled]="page() >= totalPages()"
          (click)="go(page() + 1)"
          aria-label="صفحه بعدی"
        >
          <app-icon name="chevron-left" [size]="16" />
        </button>
      </nav>
    }
  `,
  styles: `
    .ellipsis {
      padding: 0 4px;
      color: var(--text-faint);
      align-self: center;
    }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChange = output<number>();

  protected readonly faNumber = faNumber;

  /** Windowed page list with ellipses, e.g. 1 … 4 5 6 … 20 */
  protected readonly pages = computed<(number | '...')[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const items: (number | '...')[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    if (start > 2) items.push('...');
    for (let i = start; i <= end; i += 1) items.push(i);
    if (end < total - 1) items.push('...');
    items.push(total);

    return items;
  });

  protected asNumber(value: number | '...'): number {
    return value as number;
  }

  protected go(target: number): void {
    if (target < 1 || target > this.totalPages() || target === this.page()) return;
    this.pageChange.emit(target);
  }
}