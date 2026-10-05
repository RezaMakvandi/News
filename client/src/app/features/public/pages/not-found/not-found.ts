import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <div class="not-found">
        <p class="not-found-code">۴۰۴</p>
        <h1>صفحه مورد نظر یافت نشد</h1>
        <p class="text-muted">
          صفحه‌ای که دنبال آن بودید حذف شده، منتقل شده یا آدرس آن تغییر کرده است.
        </p>

        <form class="search-form" (submit)="search($event)">
          <div class="input-search grow">
            <app-icon name="search" [size]="18" />
            <input #term class="input" type="search" placeholder="جستجو در مطالب…" />
          </div>
          <button type="submit" class="btn btn-primary">جستجو</button>
        </form>

        <a class="btn btn-ghost" routerLink="/">
          <app-icon name="arrow-right" [size]="16" />
          بازگشت به صفحه اصلی
        </a>
      </div>
    </div>
  `,
  styles: `
    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
      text-align: center;
      padding: var(--space-7) var(--space-4);
    }

    .not-found-code {
      font-size: 6rem;
      font-weight: 800;
      line-height: 1;
      color: var(--accent);
      margin: 0;
    }

    .search-form {
      display: flex;
      gap: var(--space-2);
      width: min(480px, 100%);
    }
  `,
})
export class NotFoundPage {
  private readonly router = inject(Router);

  constructor() {
    inject(SeoService).set({ title: 'صفحه یافت نشد' });
  }

  protected search(event: Event): void {
    event.preventDefault();
    const term = (event.target as HTMLFormElement).querySelector<HTMLInputElement>('input')?.value.trim();
    if (term) {
      void this.router.navigate(['/search'], { queryParams: { q: term } });
    }
  }
}