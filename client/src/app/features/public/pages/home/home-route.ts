import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { SettingsService } from '../../../../core/services/settings.service';
import { HomePage } from './home';
import { ShopHomePage } from '../shop/shop-home';

/**
 * Root route (`/`): renders the home page chosen in admin settings — the news
 * home by default, or the shop storefront — keeping the URL at `/`.
 */
@Component({
  selector: 'app-home-route',
  imports: [SpinnerComponent, HomePage, ShopHomePage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <app-spinner label="در حال بارگذاری صفحه اصلی…" />
    } @else if (shopAsHome()) {
      <app-shop-home />
    } @else {
      <app-home-page />
    }
  `,
})
export class HomeRoutePage {
  private readonly settings = inject(SettingsService);

  protected readonly loading = signal(true);
  protected readonly shopAsHome = this.settings.shopAsHome;

  constructor() {
    this.settings.load().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }
}
