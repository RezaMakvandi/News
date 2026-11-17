import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '../icon/icon';
import { ScrollLockService } from '../../../core/services/scroll-lock.service';

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

  private readonly scrollLock = inject(ScrollLockService);
  private scrollLocked = false;

  constructor() {
    effect(() => this.setScrollLock(this.open()));
    // Parents often remove the modal from the DOM (inside `@if`) while its
    // `open` input is still true; make sure the page is unlocked anyway.
    inject(DestroyRef).onDestroy(() => this.setScrollLock(false));
  }

  private setScrollLock(locked: boolean): void {
    if (locked === this.scrollLocked) return;
    this.scrollLocked = locked;
    if (locked) this.scrollLock.lock();
    else this.scrollLock.release();
  }

  protected onBackdrop(): void {
    this.closed.emit();
  }

  protected onEscape(): void {
    if (this.open()) this.closed.emit();
  }
}
