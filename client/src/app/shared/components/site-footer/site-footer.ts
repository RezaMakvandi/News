import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon';
import { SettingsService } from '../../../core/services/settings.service';
import { PublicService } from '../../../core/services/public.service';
import { ToastService } from '../../../core/services/toast.service';
import type { Page } from '../../../core/models/settings.model';
import type { Category } from '../../../core/models/taxonomy.model';

interface SocialLink {
  key: string;
  icon: string;
  label: string;
  url: string;
}

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col">
            <a class="brand" routerLink="/">
              <span class="brand-mark">{{ siteInitial() }}</span>
              <span class="brand-text">
                <span class="brand-name">{{ siteName() }}</span>
                <span class="brand-tag">{{ siteTagline() }}</span>
              </span>
            </a>
            <p class="footer-about">{{ description() }}</p>

            @if (socials().length) {
              <div class="social-links">
                @for (social of socials(); track social.key) {
                  <a
                    [href]="social.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    [attr.aria-label]="social.label"
                    [title]="social.label"
                  >
                    <app-icon [name]="social.icon" [size]="18" />
                  </a>
                }
              </div>
            }
          </div>

          <div class="footer-col">
            <h4>سرویس‌های خبری</h4>
            <ul>
              @for (category of categories(); track category._id) {
                <li>
                  <a [routerLink]="['/category', category.slug]">{{ category.name }}</a>
                </li>
              }
              <li><a routerLink="/contact">تماس با ما</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>دسترسی سریع</h4>
            <ul>
              @for (page of pages(); track page._id) {
                <li>
                  <a [routerLink]="['/page', page.slug]">{{ page.title }}</a>
                </li>
              }
              <li><a routerLink="/search">جستجو</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>خبرنامه</h4>
            <p>تازه‌ترین اخبار فناوری را در ایمیل خود دریافت کنید.</p>
            <form class="newsletter-form" (submit)="subscribe($event)">
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
                } @else {
                  <app-icon name="send" [size]="16" />
                  عضویت
                }
              </button>
            </form>
          </div>
        </div>

        <div class="footer-bottom">
          <span>{{ footerText() }}</span>
          <span>{{ contact() }}</span>
        </div>
      </div>
    </footer>
  `,
  styles: `
    .brand {
      margin-bottom: var(--space-4);
    }

    .footer-about {
      margin: 0 0 var(--space-4);
      max-width: 42ch;
    }

    .spinner-sm {
      width: 16px;
      height: 16px;
      border-width: 2px;
    }
  `,
})
export class SiteFooterComponent {
  readonly categories = input<Category[]>([]);
  readonly pages = input<Page[]>([]);

  private readonly settings = inject(SettingsService);
  private readonly publicService = inject(PublicService);
  private readonly toast = inject(ToastService);

  protected readonly siteName = computed(() => (this.settings.settings()['siteName'] as string) || 'زوم‌آیتی');
  protected readonly siteTagline = computed(
    () => (this.settings.settings()['siteTagline'] as string) || 'رسانه فناوری',
  );
  protected readonly siteInitial = computed(() => this.siteName().charAt(0));
  protected readonly description = computed(
    () =>
      (this.settings.settings()['siteDescription'] as string) ||
      'رسانه تخصصی اخبار، مقالات و بررسی‌های دنیای فناوری.',
  );
  protected readonly footerText = computed(
    () => (this.settings.settings()['footerText'] as string) || `© ${new Date().getFullYear()} تمامی حقوق محفوظ است.`,
  );

  protected readonly contact = computed(() => {
    const settings = this.settings.settings();
    const email = (settings['contactEmail'] as string) || '';
    const phone = (settings['contactPhone'] as string) || '';
    return [phone, email].filter(Boolean).join(' • ');
  });

  protected readonly socials = computed<SocialLink[]>(() => {
    const settings = this.settings.settings();
    const map: { key: string; icon: string; label: string }[] = [
      { key: 'socialInstagram', icon: 'instagram', label: 'اینستاگرام' },
      { key: 'socialTwitter', icon: 'twitter', label: 'ایکس (توییتر)' },
      { key: 'socialTelegram', icon: 'telegram', label: 'تلگرام' },
      { key: 'socialYoutube', icon: 'youtube', label: 'یوتیوب' },
      { key: 'socialLinkedin', icon: 'linkedin', label: 'لینکدین' },
    ];

    return map
      .map((item) => ({ ...item, url: (settings[item.key] as string) || '' }))
      .filter((item) => Boolean(item.url));
  });

  protected readonly email = signal('');
  protected readonly submitting = signal(false);

  protected subscribe(event: Event): void {
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