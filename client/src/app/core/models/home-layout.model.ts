/**
 * Home page layout configuration.
 *
 * An ordered list of sections stored under the `homeLayout` setting and edited
 * (drag & drop) from the admin panel. Each section maps to a block renderer on
 * the public home page — including blocks that surface shop products.
 */

export type HomeSectionType =
  | 'hero'
  | 'featured_articles'
  | 'latest_articles'
  | 'category_articles'
  | 'tag_articles'
  | 'popular_articles'
  | 'breaking_articles'
  | 'products'
  | 'product_categories'
  | 'tags_cloud'
  | 'shop_banner'
  | 'newsletter'
  | 'html';

export type HomeSectionCols = 1 | 2 | 3 | 4;

export interface HomeSection {
  /** Stable id so drag & drop can track the block. */
  id: string;
  type: HomeSectionType;
  /** Optional heading override. */
  title?: string;
  /** Optional lead text shown under the heading. */
  subtitle?: string;
  /** Number of items to fetch/display. */
  limit?: number;
  /** Grid column count for card-based blocks. */
  columns?: HomeSectionCols;
  /**
   * Relative width on a 12-column grid. Consecutive sections that fit on the
   * same row are shown side by side (e.g. 8 + 4 gives a main column + sidebar).
   * Defaults to 12 (full width).
   */
  width?: number;
  /** Hidden sections are skipped when rendering. */
  enabled?: boolean;
  /** News category slug (for `category_articles`). */
  categorySlug?: string;
  /** Tag slug (for `tag_articles`). */
  tagSlug?: string;
  /** Shop category slug (for `products`). */
  productCategory?: string;
  /** Product sort key (for `products`). */
  sort?: string;
  /** Only discounted products (for `products`). */
  onSale?: boolean;
  /** Only featured products (for `products`). */
  featured?: boolean;
  /** Show a "view all" link in the block header. */
  showCta?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  /** Raw HTML for the `html` block. */
  html?: string;
}

export interface HomeSectionDef {
  type: HomeSectionType;
  label: string;
  icon: string;
  description: string;
  /** Sensible defaults merged into a freshly added section. */
  defaults: Partial<HomeSection>;
}

/** Catalogue of available blocks shown in the admin "add section" list. */
export const HOME_SECTION_DEFS: HomeSectionDef[] = [
  {
    type: 'hero',
    label: 'سرتیتر اصلی',
    icon: 'image',
    description: 'خبر ویژه بههمراه چند خبر کنار آن.',
    defaults: {},
  },
  {
    type: 'featured_articles',
    label: 'اخبار ویژه',
    icon: 'star',
    description: 'شبکهای از اخبار ویژهسازیشده.',
    defaults: {
      title: 'گزارشهای ویژه',
      limit: 4,
      columns: 4,
      showCta: true,
      ctaLabel: 'مشاهده همه',
      ctaHref: '/search',
    },
  },
  {
    type: 'latest_articles',
    label: 'تازهترین اخبار',
    icon: 'file',
    description: 'آخرین اخبار منتشرشده.',
    defaults: {
      title: 'تازهترین اخبار',
      limit: 8,
      columns: 4,
      showCta: true,
      ctaLabel: 'آرشیو کامل اخبار',
      ctaHref: '/search',
    },
  },
  {
    type: 'category_articles',
    label: 'اخبار یک دسته',
    icon: 'folder',
    description: 'آخرین اخبار یک دستهبندی مشخص.',
    defaults: {
      title: 'اخبار دسته',
      limit: 4,
      columns: 4,
      categorySlug: '',
      showCta: true,
      ctaLabel: 'مشاهده همه',
      ctaHref: '/search',
    },
  },
  {
    type: 'tag_articles',
    label: 'اخبار یک برچسب',
    icon: 'tag',
    description: 'آخرین اخبار مرتبط با یک برچسب.',
    defaults: { title: 'اخبار برچسب', limit: 4, columns: 4, tagSlug: '', showCta: false },
  },
  {
    type: 'popular_articles',
    label: 'پربازدیدترینها',
    icon: 'chart',
    description: 'پر بازدیدترین اخبار دو هفته اخیر.',
    defaults: { title: 'پربازدیدترینها', limit: 6, columns: 3, showCta: false },
  },
  {
    type: 'breaking_articles',
    label: 'خبرهای فوری',
    icon: 'bell',
    description: 'فهرست خبرهای فوری (breaking).',
    defaults: { title: 'خبرهای فوری', limit: 5, showCta: false },
  },
  {
    type: 'products',
    label: 'محصولات فروشگاه',
    icon: 'package',
    description: 'نمایش کالاهای فروشگاه (جدید، پرفروش، تخفیفدار...).',
    defaults: {
      title: 'جدیدترین کالاها',
      limit: 4,
      columns: 4,
      sort: 'newest',
      showCta: true,
      ctaLabel: 'مشاهده فروشگاه',
      ctaHref: '/shop/products',
    },
  },
  {
    type: 'product_categories',
    label: 'دستهبندی محصولات',
    icon: 'grid',
    description: 'کاشیهای دستهبندی کالاهای فروشگاه.',
    defaults: {
      title: 'دستهبندی محصولات',
      limit: 8,
      columns: 4,
      showCta: true,
      ctaLabel: 'همه محصولات',
      ctaHref: '/shop/products',
    },
  },
  {
    type: 'tags_cloud',
    label: 'برچسبهای داغ',
    icon: 'tag',
    description: 'ابری از پرکاربردترین برچسبها.',
    defaults: { title: 'برچسبهای داغ', limit: 14 },
  },
  {
    type: 'shop_banner',
    label: 'بنر فروشگاه',
    icon: 'store',
    description: 'بنر تبلیغاتی با پیوند به فروشگاه.',
    defaults: {
      title: 'فروشگاه کالای دیجیتال',
      subtitle: 'جدیدترین گجتها با گارانتی معتبر و ارسال سریع.',
      ctaLabel: 'ورود به فروشگاه',
      ctaHref: '/shop',
    },
  },
  {
    type: 'newsletter',
    label: 'خبرنامه',
    icon: 'mail',
    description: 'فراخوان عضویت در خبرنامه.',
    defaults: {
      title: 'خبرنامه',
      subtitle: 'مهمترین خبرهای فناوری روز را در ایمیل خود دریافت کنید.',
      ctaLabel: 'عضویت در خبرنامه',
      ctaHref: '/contact',
    },
  },
  {
    type: 'html',
    label: 'محتوای دلخواه (HTML)',
    icon: 'file',
    description: 'بلوک HTML آزاد برای بنر یا متن دلخواه.',
    defaults: { html: '' },
  },
];

export const HOME_SECTION_DEF_MAP: Record<string, HomeSectionDef> = Object.fromEntries(
  HOME_SECTION_DEFS.map((def) => [def.type, def]),
);

/** Sections shown on a fresh install (headlines kept intentionally article-first). */
export const HOME_LAYOUT_DEFAULT: HomeSection[] = [
  { id: 'hero', type: 'hero', enabled: true, width: 12 },
  {
    id: 'featured_articles',
    type: 'featured_articles',
    enabled: true,
    ...HOME_SECTION_DEF_MAP['featured_articles'].defaults,
  },
  {
    id: 'latest_articles',
    type: 'latest_articles',
    enabled: true,
    ...HOME_SECTION_DEF_MAP['latest_articles'].defaults,
  },
  {
    id: 'products',
    type: 'products',
    enabled: true,
    ...HOME_SECTION_DEF_MAP['products'].defaults,
  },
  {
    id: 'popular_articles',
    type: 'popular_articles',
    enabled: true,
    width: 8,
    ...HOME_SECTION_DEF_MAP['popular_articles'].defaults,
  },
  {
    id: 'tags_cloud',
    type: 'tags_cloud',
    enabled: true,
    width: 4,
    ...HOME_SECTION_DEF_MAP['tags_cloud'].defaults,
  },
];

/** Width presets offered in the admin editor (12-column grid). */
export const HOME_WIDTH_OPTIONS: { value: number; label: string; icon: string }[] = [
  { value: 12, label: 'تمام عرض', icon: 'list' },
  { value: 9, label: 'عرض ۳/۴', icon: 'grid' },
  { value: 8, label: 'عرض ۲/۳', icon: 'grid' },
  { value: 6, label: 'نصف', icon: 'grid' },
  { value: 4, label: 'عرض ۱/۳', icon: 'grid' },
  { value: 3, label: 'یکچهارم', icon: 'grid' },
];

export function sectionWidth(section: HomeSection): number {
  const width = Number(section.width);
  if (!Number.isFinite(width) || width <= 0) return 12;
  return Math.min(12, Math.max(1, Math.round(width)));
}

/**
 * Groups sections into rows that share horizontal space. A row keeps accepting
 * sections while their combined width stays within 12 columns; sections that
 * would overflow start a new row (they never wrap on their own).
 */
export function layoutRows(sections: HomeSection[]): HomeSection[][] {
  const rows: HomeSection[][] = [];
  let current: HomeSection[] = [];
  let used = 0;

  for (const section of sections) {
    const width = sectionWidth(section);
    if (current.length && (used + width > 12 || width === 12 || used === 12)) {
      rows.push(current);
      current = [];
      used = 0;
    }
    current.push(section);
    used += width;
  }

  if (current.length) rows.push(current);
  return rows;
}

export function sectionMeta(type: HomeSectionType): HomeSectionDef {
  return HOME_SECTION_DEF_MAP[type] ?? HOME_SECTION_DEFS[0];
}

/** Creates a new section instance with defaults applied. */
export function newHomeSection(type: HomeSectionType): HomeSection {
  return {
    id: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    enabled: true,
    ...sectionMeta(type).defaults,
  };
}

/** Narrows unknown input to a valid section list, dropping malformed entries. */
export function normalizeHomeLayout(value: unknown): HomeSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => {
      const type = String(item['type'] ?? '') as HomeSectionType;
      const def = HOME_SECTION_DEF_MAP[type];
      if (!def) return null;
      return {
        ...def.defaults,
        ...item,
        id: String(item['id'] ?? `s${index}`),
        type,
        enabled: item['enabled'] !== false,
      } as HomeSection;
    })
    .filter((item): item is HomeSection => item !== null);
}

/** True when the setting holds at least one known section. */
export function hasHomeLayout(value: unknown): boolean {
  return normalizeHomeLayout(value).length > 0;
}
