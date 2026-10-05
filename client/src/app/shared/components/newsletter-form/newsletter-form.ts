import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PublicService } from '../../../core/services/public.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-newsletter-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="newsletter-form" (submit)="submit($event)">
      <input
        class="input"
        type="email"
        name="email"
        required
        placeholder="نشانی ایمیل شما"
        [value]="email()"
        (input)="email.set($any($event.target).value)"
        [disabled]="submitting()"
        aria-label="نشانی ایمیل"
      />
      <button type="submit" class="btn btn-primary" [disabled]="submitting()">
        @if (submitting()) {
          <span class="spinner spinner-sm"></span>
          در حال ثبت…
        } @else {
          عضویت در خبرنامه
        }
      </button>
    </form>
  `,
  styles: `
    .spinner-sm {
      width: 16px;
      height: 16px;
      border-width: 2px;
    }
  `,
})
export class NewsletterFormComponent {
  private readonly publicService = inject(PublicService);
  private readonly toast = inject(ToastService);

  protected readonly email = signal('');
  protected readonly submitting = signal(false);

  protected submit(event: Event): void {
    event.preventDefault();
    const value = this.email().trim();
    if (!value || this.submitting()) return;

    this.submitting.set(true);
    this.publicService.subscribe(value).subscribe({
      next: (message) => {
        this.submitting.set(false);
        this.email.set('');
        this.toast.success(message);
      },
      error: (error: Error) => {
        this.submitting.set(false);
        this.toast.error(error.message);
      },
    });
  }
}