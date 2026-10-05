import type { CategoryRef } from '../models/taxonomy.model';
import type { AuthorRef } from '../models/user.model';
import type { TagRef } from '../models/article.model';

/**
 * Article documents populate `category`, `author` and `tags` on list/detail
 * endpoints but keep raw ObjectId strings elsewhere (e.g. admin payloads), so
 * every template needs these narrowing helpers.
 */
export function asCategory(value: CategoryRef | string | null | undefined): CategoryRef | null {
  return typeof value === 'object' && value !== null ? value : null;
}

export function asAuthor(value: AuthorRef | string | null | undefined): AuthorRef | null {
  return typeof value === 'object' && value !== null ? value : null;
}

export function asTags(values: (TagRef | string)[] | null | undefined): TagRef[] {
  return (values ?? []).filter((tag): tag is TagRef => typeof tag === 'object' && tag !== null);
}

export function idOf(value: { _id: string } | string | null | undefined): string {
  if (!value) return '';
  return typeof value === 'string' ? value : value._id;
}

/** First letter of a name, used for avatar fallbacks. */
export function initial(name?: string | null): string {
  const trimmed = (name ?? '').trim();
  return trimmed ? trimmed.charAt(0) : '؟';
}

/** A deterministic colour per category, falling back to the site accent. */
export function categoryColor(value: CategoryRef | string | null | undefined): string {
  return asCategory(value)?.color || 'var(--accent)';
}

export function categoryName(value: CategoryRef | string | null | undefined): string {
  return asCategory(value)?.name ?? 'دسته‌بندی نشده';
}

export function categorySlug(value: CategoryRef | string | null | undefined): string {
  return asCategory(value)?.slug ?? '';
}

export function categoryIcon(value: CategoryRef | string | null | undefined): string {
  return asCategory(value)?.icon || 'folder';
}

export function authorName(value: AuthorRef | string | null | undefined): string {
  return asAuthor(value)?.name ?? 'تحریریه';
}

export function authorSlug(value: AuthorRef | string | null | undefined): string {
  return asAuthor(value)?.slug ?? '';
}

export function isVideo(type?: string | null): boolean {
  return type === 'video';
}

export function isGallery(type?: string | null): boolean {
  return type === 'gallery';
}

/** Builds an absolute share URL for the current origin. */
export function shareUrl(path: string): string {
  return `${window.location.origin}${path}`;
}