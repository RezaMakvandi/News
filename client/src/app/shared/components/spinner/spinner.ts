import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spinner-wrap" [class.is-inline]="inline()">
      <span class="spinner"></span>
      @if (label()) {
        <span class="spinner-label">{{ label() }}</span>
      }
    </div>
  `,
  styles: `
    .spinner-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      padding: var(--space-7) 0;
      color: var(--text-muted);
    }

    .spinner-wrap.is-inline {
      flex-direction: row;
      padding: 0;
      gap: var(--space-2);
    }

    .spinner-label {
      font-size: 0.85rem;
    }
  `,
})
export class SpinnerComponent {
  readonly label = input('در حال بارگذاری…');
  readonly inline = input(false);
}