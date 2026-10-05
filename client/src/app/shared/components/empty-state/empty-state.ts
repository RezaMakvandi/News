import { ChangeDetectionStrategy, Component, output, input } from '@angular/core';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      <div class="empty-icon">
        <app-icon [name]="icon()" [size]="30" />
      </div>
      <h3>{{ title() }}</h3>
      @if (description()) {
        <p class="text-sm text-muted">{{ description() }}</p>
      }
      @if (actionLabel()) {
        <button type="button" class="btn btn-primary btn-sm" (click)="action.emit()">
          @if (actionIcon()) {
            <app-icon [name]="actionIcon()" [size]="16" />
          }
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input('info');
  readonly title = input('موردی یافت نشد');
  readonly description = input('');
  readonly actionLabel = input('');
  readonly actionIcon = input('');

  readonly action = output<void>();
}