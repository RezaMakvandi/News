import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { PublicService } from '../../../../core/services/public.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { faNumber } from '../../../../core/utils/format';

@Component({
  selector: 'app-contact-page',
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-banner">
      <div class="container">
        <h1>تماس با ما</h1>
        <p>پیشنهادها، انتقادها و سوژه‌های خبری خود را با ما در میان بگذارید.</p>
      </div>
    </div>

    <div class="container page">
      <div class="contact-grid">
        <div class="card card-pad">
          <h2 class="contact-title">ارسال پیام</h2>

          <form (submit)="submit($event)" class="stack-lg">
            <div class="grid-2">
              <div class="field">
                <label class="label" for="contact-name">نام و نام خانوادگی <span class="req">*</span></label>
                <input
                  id="contact-name"
                  class="input"
                  name="name"
                  [class.is-invalid]="errors()['name']"
                  [(ngModel)]="form.name"
                  placeholder="مثال: سارا محمدی"
                />
                @if (errors()['name']) {
                  <span class="error-text">{{ errors()['name'] }}</span>
                }
              </div>

              <div class="field">
                <label class="label" for="contact-email">ایمیل <span class="req">*</span></label>
                <input
                  id="contact-email"
                  class="input"
                  type="email"
                  name="email"
                  dir="ltr"
                  [class.is-invalid]="errors()['email']"
                  [(ngModel)]="form.email"
                  placeholder="you@example.com"
                />
                @if (errors()['email']) {
                  <span class="error-text">{{ errors()['email'] }}</span>
                }
              </div>
            </div>

            <div class="field">
              <label class="label" for="contact-subject">موضوع <span class="req">*</span></label>
              <input
                id="contact-subject"
                class="input"
                name="subject"
                [class.is-invalid]="errors()['subject']"
                [(ngModel)]="form.subject"
                placeholder="موضوع پیام شما"
              />
              @if (errors()['subject']) {
                <span class="error-text">{{ errors()['subject'] }}</span>
              }
            </div>

            <div class="field">
              <label class="label" for="contact-body">متن پیام <span class="req">*</span></label>
              <textarea
                id="contact-body"
                class="textarea"
                name="body"
                rows="7"
                [class.is-invalid]="errors()['body']"
                [(ngModel)]="form.body"
                placeholder="پیام خود را با جزئیات بنویسید…"
              ></textarea>
              <span class="hint">{{ remaining() }} کاراکتر باقی مانده</span>
              @if (errors()['body']) {
                <span class="error-text">{{ errors()['body'] }}</span>
              }
            </div>

            <button type="submit" class="btn btn-primary btn-lg" [disabled]="submitting()">
              @if (submitting()) {
                <span class="spinner spinner-sm"></span>
              } @else {
                <app-icon name="send" [size]="18" />
              }
              ارسال پیام
            </button>
          </form>
        </div>

        <aside class="stack-lg">
          <div class="card card-pad">
            <h3 class="contact-title">راه‌های ارتباطی</h3>

            <ul class="contact-list">
              @if (email()) {
                <li>
                  <span class="contact-icon"><app-icon name="mail" [size]="18" /></span>
                  <span>
                    <span class="contact-label">ایمیل</span>
                    <a class="contact-value" [href]="'mailto:' + email()" dir="ltr">{{ email() }}</a>
                  </span>
                </li>
              }
              @if (phone()) {
                <li>
                  <span class="contact-icon"><app-icon name="bell" [size]="18" /></span>
                  <span>
                    <span class="contact-label">تلفن</span>
                    <a class="contact-value" [href]="'tel:' + phone()" dir="ltr">{{ phone() }}</a>
                  </span>
                </li>
              }
              @if (address()) {
                <li>
                  <span class="contact-icon"><app-icon name="globe" [size]="18" /></span>
                  <span>
                    <span class="contact-label">نشانی</span>
                    <span class="contact-value">{{ address() }}</span>
                  </span>
                </li>
              }
            </ul>
          </div>

          @if (socials().length) {
            <div class="card card-pad">
              <h3 class="contact-title">ما را دنبال کنید</h3>
              <div class="social-links">
                @for (item of socials(); track item.name) {
                  <a class="btn btn-ghost btn-icon" [href]="item.url" target="_blank" rel="noopener" [attr.aria-label]="item.name">
                    <app-icon [name]="item.name" [size]="18" />
                  </a>
                }
              </div>
            </div>
          }
        </aside>
      </div>
    </div>
  `,
  styles: `
    .contact-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      gap: var(--space-6);
      align-items: start;
    }

    .contact-title {
      margin-bottom: var(--space-4);
      font-size: 1.125rem;
    }

    .stack-lg > * + * {
      margin-top: var(--space-4);
    }

    .contact-list {
      display: grid;
      gap: var(--space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .contact-list li {
      display: flex;
      gap: var(--space-3);
      align-items: flex-start;
    }

    .contact-icon {
      width: 38px;
      height: 38px;
      flex: none;
      border-radius: var(--radius-sm);
      background: var(--accent-soft);
      color: var(--accent);
      display: grid;
      place-items: center;
    }

    .contact-label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-faint);
      margin-bottom: 2px;
    }

    .contact-value {
      color: var(--text-strong);
      font-weight: 600;
      word-break: break-word;
    }

    @media (max-width: 900px) {
      .contact-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ContactPage {
  private readonly publicService = inject(PublicService);
  private readonly settingsService = inject(SettingsService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly submitting = signal(false);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly form = { name: '', email: '', subject: '', body: '' };

  private readonly settings = this.settingsService.settings;
  protected readonly email = computed(() => (this.settings()['contactEmail'] as string) || '');
  protected readonly phone = computed(() => (this.settings()['contactPhone'] as string) || '');
  protected readonly address = computed(() => (this.settings()['address'] as string) || '');

  protected readonly socials = computed(() =>
    (
      [
        { name: 'instagram', key: 'socialInstagram' },
        { name: 'twitter', key: 'socialTwitter' },
        { name: 'telegram', key: 'socialTelegram' },
        { name: 'youtube', key: 'socialYoutube' },
        { name: 'linkedin', key: 'socialLinkedin' },
      ] as const
    )
      .map((item) => ({ name: item.name, url: (this.settings()[item.key] as string) || '' }))
      .filter((item) => item.url),
  );

  protected readonly remaining = computed(() => faNumber(Math.max(0, 4000 - this.form.body.length)));

  constructor() {
    this.seo.set({ title: 'تماس با ما' });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (!this.validate()) return;

    this.submitting.set(true);
    this.publicService
      .sendMessage({
        name: this.form.name.trim(),
        email: this.form.email.trim(),
        subject: this.form.subject.trim(),
        body: this.form.body.trim(),
      })
      .subscribe({
        next: (message) => {
          this.submitting.set(false);
          this.errors.set({});
          this.form.name = '';
          this.form.email = '';
          this.form.subject = '';
          this.form.body = '';
          this.toast.success(message || 'پیام شما با موفقیت ارسال شد');
        },
        error: () => this.submitting.set(false),
      });
  }

  private validate(): boolean {
    const errors: Record<string, string> = {};

    if (this.form.name.trim().length < 3) errors['name'] = 'نام باید حداقل ۳ کاراکتر باشد';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) errors['email'] = 'ایمیل معتبر نیست';
    if (this.form.subject.trim().length < 3) errors['subject'] = 'موضوع باید حداقل ۳ کاراکتر باشد';
    if (this.form.body.trim().length < 10) errors['body'] = 'متن پیام باید حداقل ۱۰ کاراکتر باشد';
    if (this.form.body.length > 4000) errors['body'] = 'متن پیام بیش از حد طولانی است';

    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }
}