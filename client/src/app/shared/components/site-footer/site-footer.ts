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

interface FooterLinkView {
  label: string;
  url: string;
}

interface FooterSectionView {
  title: string;
  links: FooterLinkView[];
}

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid" [style.--footer-cols]="gridTemplate()">
          @if (footer().showBrand) {
            <div class="footer-col">
              <a class="brand" routerLink="/">
                @if (logo()) {
                  <img class="footer-logo" [src]="logo()" [alt]="siteName()" />
                } @else {
                  <span class="brand-mark">{{ siteInitial() }}</span>
                  <span class="brand-text">
                    <span class="brand-name">{{ siteName() }}</span>
                    <span class="brand-tag">{{ siteTagline() }}</span>
                  </span>
                }
              </a>
              <p class="footer-about">{{ description() }}</p>

              @if (footer().showSocials && socials().length) {
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
          }

          @for (section of sections(); track $index) {
            <div class="footer-col">
              <h4>{{ section.title }}</h4>
              <ul>
                @for (link of section.links; track $index) {
                  <li>
                    @if (isInternal(link.url)) {
                      <a [routerLink]="link.url">{{ link.label }}</a>
                    } @else {
                      <a [href]="link.url" target="_blank" rel="noopener noreferrer">
                        {{ link.label }}
                      </a>
                    }
                  </li>
                }
              </ul>
            </div>
          }

          @if (footer().showNewsletter) {
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
          }
        </div>

        @if (badges().length) {
          <div class="footer-badges">
            @for (badge of badges(); track $index) {
              @if (badge.url) {
                <a
                  class="footer-badge"
                  [href]="badge.url"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  [title]="badge.alt || 'نشان اعتماد'"
                >
                  <img [src]="badge.image" [alt]="badge.alt || 'نشان اعتماد'" loading="lazy" />
                </a>
              } @else {
                <span class="footer-badge">
                  <img [src]="badge.image" [alt]="badge.alt || 'نشان اعتماد'" loading="lazy" />
                </span>
              }
            }
          </div>
        }

        <div class="footer-bottom">
          <span>{{ copyright() }}</span>
          @if (contact()) {
            <span>{{ contact() }}</span>
          }
        </div>
      </div>
    </footer>
  `,
  styles: `
    .brand {
      margin-bottom: var(--space-4);
    }

    .footer-logo {
      display: block;
      max-width: 180px;
      max-height: 52px;
      width: auto;
      height: auto;
      object-fit: contain;
    }

    .footer-about {
      margin: 0 0 var(--space-4);
      max-width: 42ch;
    }

    .footer-badges {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-3);
      padding: 0 0 var(--space-5);
    }

    .footer-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 84px;
      height: 84px;
      padding: 6px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: #fff;
      transition: border-color var(--transition-fast);

      &:hover {
        border-color: var(--accent);
      }

      img {
        display: block;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
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

  protected readonly footer = computed(() => this.settings.footerConfig());

  protected readonly siteName = computed(
    () => (this.settings.settings()['siteName'] as string) || 'زوم‌آیتی',
  );
  protected readonly siteTagline = computed(
    () => (this.settings.settings()['siteTagline'] as string) || 'رسانه فناوری',
  );
  protected readonly siteInitial = computed(() => this.siteName().charAt(0));
  protected readonly logo = computed(
    () => this.footer().logo || (this.settings.settings()['siteLogo'] as string) || '',
  );
  protected readonly description = computed(
    () =>
      this.footer().about ||
      (this.settings.settings()['siteDescription'] as string) ||
      'رسانه تخصصی اخبار، مقالات و بررسی‌های دنیای فناوری.',
  );
  protected readonly copyright = computed(
    () =>
      this.footer().copyright ||
      (this.settings.settings()['footerText'] as string) ||
      `© ${new Date().getFullYear()} تمامی حقوق محفوظ است.`,
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

  /** Sections resolved from categories/pages plus the admin's custom links. */
  protected readonly sections = computed<FooterSectionView[]>(() => {
    const config = this.footer();
    const categories = this.categories();
    const pages = this.pages();

    return config.sections
      .map((section) => {
        const dynamic: FooterLinkView[] =
          section.source === 'categories'
            ? categories.map((category) => ({
                label: category.name,
                url: `/category/${category.slug}`,
              }))
            : section.source === 'pages'
              ? pages.map((page) => ({ label: page.title, url: `/page/${page.slug}` }))
              : [];

        const seen = new Set<string>();
        const links = [...dynamic, ...section.links]
          .filter((link) => Boolean(link.label?.trim() && link.url?.trim()))
          .filter((link) => (seen.has(link.url) ? false : Boolean(seen.add(link.url))));

        return { title: section.title.trim(), links };
      })
      .filter((section) => Boolean(section.title && section.links.length));
  });

  protected readonly badges = computed(() =>
    this.footer().badges.filter((badge) => Boolean(badge.image)),
  );

  /** One grid track per visible column, so any number of sections lays out. */
  protected readonly gridTemplate = computed(() => {
    const config = this.footer();
    const parts: string[] = [];
    if (config.showBrand) parts.push('1.6fr');
    for (const _ of this.sections()) parts.push('1fr');
    if (config.showNewsletter) parts.push('1.4fr');
    return parts.length ? parts.join(' ') : '1fr';
  });

  protected readonly email = signal('');
  protected readonly submitting = signal(false);

  protected isInternal(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//');
  }

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
