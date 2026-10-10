import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../icon/icon';
import { FaNumberPipe } from '../../pipes/format.pipe';
import type { ProductCard } from '../../../core/models/product.model';
import {
  asBrand,
  asProductCategory,
  discountPercent,
  finalPrice,
  toman,
} from '../../../core/utils/shop';

/** Reusable star rating row (read-only). */
@Component({
  selector: 'app-stars',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="stars" [attr.aria-label]="'امتیاز ' + value() + ' از ۵'">
      @for (bucket of buckets(); track $index) {
        @if (bucket === 'empty') {
          <app-icon name="star" [size]="size()" />
        } @else {
          <app-icon name="star-filled" [size]="size()" class="is-on" />
        }
      }
      @if (showValue()) {
        <span class="stars-value">{{ value().toFixed(1) }}</span>
      }
    </span>
  `,
  styles: `
    .stars {
      display: inline-flex;
      align-items: center;
      gap: 1px;
      color: var(--border-strong);
    }

    .stars app-icon.is-on {
      color: #f59e0b;
    }

    .stars-value {
      margin-inline-start: 4px;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
  `,
})
export class StarsComponent {
  readonly value = input.required<number>();
  readonly size = input(13);
  readonly showValue = input(false);

  protected readonly buckets = computed<('full' | 'half' | 'empty')[]>(() => {
    const rating = this.value();
    const result: ('full' | 'half' | 'empty')[] = [];
    for (let i = 1; i <= 5; i += 1) {
      if (rating >= i) result.push('full');
      else if (rating >= i - 0.5) result.push('half');
      else result.push('empty');
    }
    return result;
  });
}
