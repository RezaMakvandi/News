import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * Reference-counted body scroll lock shared by overlays (modals, drawers).
 * Each overlay locks while visible and must release on close *and* destroy,
 * so a modal removed from the DOM can never leave the page unscrollable.
 */
@Injectable({ providedIn: 'root' })
export class ScrollLockService {
  private readonly document = inject(DOCUMENT);
  private locks = 0;
  private previousOverflow = '';

  lock(): void {
    if (this.locks === 0) {
      this.previousOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = 'hidden';
    }
    this.locks++;
  }

  release(): void {
    if (this.locks === 0) return;
    this.locks--;
    if (this.locks === 0) {
      this.document.body.style.overflow = this.previousOverflow;
    }
  }
}
