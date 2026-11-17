/** Where a footer section gets its links from. */
export type FooterSectionSource = 'custom' | 'categories' | 'pages';

export interface FooterLink {
  label: string;
  /** Site-relative path (`/contact`), absolute URL, `mailto:` or `tel:`. */
  url: string;
}

export interface FooterSection {
  title: string;
  /** Dynamic sources are merged with the extra `links` below. */
  source: FooterSectionSource;
  links: FooterLink[];
}

/** A trust badge such as اینماد, ساماندهی or any custom image. */
export interface FooterBadge {
  image: string;
  url?: string;
  alt?: string;
}

/** Everything rendered in the public site footer, edited from /admin/settings. */
export interface FooterConfig {
  /** Shows the brand column (logo/name, about text and social links). */
  showBrand: boolean;
  showSocials: boolean;
  showNewsletter: boolean;
  /** Footer-specific logo; falls back to the general `siteLogo` setting. */
  logo: string;
  /** Replaces the general site description in the footer when set. */
  about: string;
  /** Replaces the general `footerText` setting when set. */
  copyright: string;
  /** Ordered footer columns. */
  sections: FooterSection[];
  badges: FooterBadge[];
}

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  showBrand: true,
  showSocials: true,
  showNewsletter: true,
  logo: '',
  about: '',
  copyright: '',
  sections: [
    {
      title: 'سرویس‌های خبری',
      source: 'categories',
      links: [{ label: 'تماس با ما', url: '/contact' }],
    },
    {
      title: 'دسترسی سریع',
      source: 'pages',
      links: [{ label: 'جستجو', url: '/search' }],
    },
  ],
  badges: [],
};

/** Only allow link/image values that cannot execute script. */
const SAFE_URL = /^(https?:\/\/|\/|mailto:|tel:|#)/i;

const toText = (value: unknown, max = 500): string =>
  typeof value === 'string' ? value.slice(0, max) : value === null || value === undefined ? '' : String(value).slice(0, max);

const toSafeUrl = (value: unknown): string => {
  const url = toText(value, 1000).trim();
  return SAFE_URL.test(url) ? url : '';
};

const toBool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : value === 'true' ? true : value === 'false' ? false : fallback;

const toSource = (value: unknown): FooterSectionSource =>
  value === 'categories' || value === 'pages' ? value : 'custom';

/** Coerces whatever is stored in the settings document into a complete config. */
export function normalizeFooterConfig(value: unknown): FooterConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return cloneFooterConfig(DEFAULT_FOOTER_CONFIG);
  }

  const raw = value as Record<string, unknown>;
  const sections = Array.isArray(raw['sections']) ? raw['sections'] : [];
  const badges = Array.isArray(raw['badges']) ? raw['badges'] : [];

  return {
    showBrand: toBool(raw['showBrand'], true),
    showSocials: toBool(raw['showSocials'], true),
    showNewsletter: toBool(raw['showNewsletter'], true),
    logo: toSafeUrl(raw['logo']),
    about: toText(raw['about'], 600),
    copyright: toText(raw['copyright'], 300),
    sections: sections
      .filter((section): section is Record<string, unknown> => Boolean(section) && typeof section === 'object')
      .slice(0, 8)
      .map((section) => ({
        title: toText(section['title'], 80),
        source: toSource(section['source']),
        links: (Array.isArray(section['links']) ? section['links'] : [])
          .filter((link): link is Record<string, unknown> => Boolean(link) && typeof link === 'object')
          .slice(0, 15)
          .map((link) => ({
            label: toText(link['label'], 80),
            url: toSafeUrl(link['url']),
          })),
      })),
    badges: badges
      .filter((badge): badge is Record<string, unknown> => Boolean(badge) && typeof badge === 'object')
      .slice(0, 10)
      .map((badge) => ({
        image: toSafeUrl(badge['image']),
        url: toSafeUrl(badge['url']),
        alt: toText(badge['alt'], 120),
      })),
  };
}

/** Deep copy so admin edits never mutate the last saved config. */
export function cloneFooterConfig(config: FooterConfig): FooterConfig {
  return {
    ...config,
    sections: config.sections.map((section) => ({
      ...section,
      links: section.links.map((link) => ({ ...link })),
    })),
    badges: config.badges.map((badge) => ({ ...badge })),
  };
}
