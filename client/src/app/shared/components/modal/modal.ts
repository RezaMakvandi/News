import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon';

/**
 * Accessible modal shell. Emits `closed` on backdrop click, Escape, or the
 * close button; the host page decides what to do with the result.
 */
@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="modal-backdrop" (click)="onBackdrop()" (keydown.escape)="closed.emit()">
        <div
          class="modal"
          [class.modal-lg]="size() === 'lg'"
          [class.modal-xl]="size() === 'xl'"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          tabindex="-1"
          (click)="$event.stopPropagation()"
        >
          <div class="modal-head">
            <h3>{{ title() }}</h3>
            <button type="button" class="btn btn-icon" (click)="closed.emit()" aria-label="بستن">
              <app-icon name="close" [size]="18" />
            </button>
          </div>
          <div class="modal-body">
            <ng-content />
          </div>
          @if (hasFooter()) {
            <div class="modal-foot">
              <ng-content select="[modalFooter]" />
            </div>
          }
        </div>
      </div>
    }
  `,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly size = input<'sm' | 'lg' | 'xl'>('sm');
  readonly hasFooter = input(true);

  readonly closed = output<void>();

  constructor() {
    effect(() => {
      const isOpen = this.open();
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  protected onBackdrop(): void {
    this.closed.emit();
  }

  protected onEscape(): void {
    if (this.open()) this.closed.emit();
  }
}