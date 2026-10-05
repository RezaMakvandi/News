import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon';
import type { ArticleCard } from '../../../core/models/article.model';

@Component({
  selector: 'app-breaking-ticker',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length) {
      <div class="ticker">
        <span class="ticker-label">
          <app-icon name="bell" [size]="15" />
          خبر فوری
        </span>
        <div class="ticker-track">
          @for (item of items(); track item._id) {
            <a class="ticker-item" [routerLink]="['/news', item.slug]">{{ item.title }}</a>
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class BreakingTickerComponent {
  readonly items = input<ArticleCard[]>([]);
}