import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingService } from './core/services/loading.service';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading.isLoading()) {
      <div class="progress progress-top" role="progressbar" aria-label="در حال بارگذاری"></div>
    }
    <router-outlet />
    <app-toast-container />
  `,
  styles: `
    .progress-top {
      position: fixed;
      inset-block-start: 0;
      inset-inline: 0;
      z-index: var(--z-toast);
      height: 3px;
      border-radius: 0;
    }
  `,
})
export class App {
  protected readonly loading = inject(LoadingService);
}