import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon';

/** Simple centred confirmation dialog used before destructive admin actions. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="modal-backdrop" (click)="cancel.emit()">
        <div
          class="modal confirm-modal"
          role="alertdialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <div class="modal-body confirm-body">
            <span class="confirm-icon" [class.is-danger]="danger()">
              <app-icon [name]="icon()" [size]="26" />
            </span>
            <h3>{{ title() }}</h3>
            <p class="text-sm text-muted">{{ message() }}</p>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" (click)="cancel.emit()" [disabled]="busy()">
              انصراف
            </button>
            <button
              type="button"
              [class]="danger() ? 'btn btn-danger' : 'btn btn-primary'"
              (click)="confirm.emit()"
              [disabled]="busy()"
            >
              @if (busy()) {
                <span class="spinner spinner-sm"></span>
              }
              {{ confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .confirm-modal {
      max-width: 420px;
    }

    .confirm-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      text-align: center;
    }

    .confirm-icon {
      display: grid;
      place-items: center;
      width: 54px;
      height: 54px;
      border-radius: var(--radius-full);
      background: var(--accent-soft);
      color: var(--accent);
      margin-bottom: var(--space-2);
    }

    .confirm-icon.is-danger {
      background: var(--danger-soft);
      color: var(--danger);
    }

    .spinner-sm {
      width: 16px;
      height: 16px;
      border-width: 2px;
    }
  `,
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('آیا مطمئن هستید؟');
  readonly message = input('این عملیات قابل بازگشت نیست.');
  readonly confirmLabel = input('تأیید و حذف');
  readonly icon = input('warning');
  readonly danger = input(true);
  readonly busy = input(false);

  readonly confirm = output<void>();
  readonly cancel = output<void>();
}