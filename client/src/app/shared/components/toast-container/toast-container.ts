import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, type ToastTone } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack" role="status" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="'toast ' + toneClass(toast.tone)" role="alert">
          <div class="grow">
            <strong class="toast-title">{{ toast.title }}</strong>
            <p class="toast-message">{{ toast.message }}</p>
          </div>
          <button
            type="button"
            class="toast-close"
            (click)="toasts.dismiss(toast.id)"
            aria-label="بستن پیام"
          >
            &times;
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-title {
      display: block;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-strong);
    }

    .toast-message {
      margin: 2px 0 0;
      font-size: 0.85rem;
      line-height: 1.7;
      color: var(--text-muted);
      overflow-wrap: anywhere;
    }
  `,
})
export class ToastContainerComponent {
  protected readonly toasts = inject(ToastService);

  protected toneClass(tone: ToastTone): string {
    return `is-${tone}`;
  }
}