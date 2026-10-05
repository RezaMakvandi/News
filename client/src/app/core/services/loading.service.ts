import { Injectable, computed, signal } from '@angular/core';

/** Tracks in-flight requests so the shell can show a top progress bar. */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly active = signal(0);
  readonly isLoading = computed(() => this.active() > 0);

  start(): void {
    this.active.update((count) => count + 1);
  }

  stop(): void {
    this.active.update((count) => Math.max(0, count - 1));
  }
}