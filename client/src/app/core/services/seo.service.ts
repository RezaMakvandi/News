import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/** Keeps the document title and social meta tags in sync with each route. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  set(options: {
    title?: string;
    description?: string;
    keywords?: string[];
    image?: string;
    url?: string;
    type?: string;
  }): void {
    const siteName = 'زوم‌آیتی';
    const fullTitle = options.title ? `${options.title} | ${siteName}` : siteName;
    this.title.setTitle(fullTitle);

    this.updateTag('name', 'description', options.description ?? '');
    this.updateTag('name', 'keywords', options.keywords?.join('، ') ?? '');

    this.updateTag('property', 'og:title', fullTitle);
    this.updateTag('property', 'og:description', options.description ?? '');
    this.updateTag('property', 'og:type', options.type ?? 'website');
    this.updateTag('property', 'og:site_name', siteName);

    if (options.image) this.updateTag('property', 'og:image', options.image);
    if (options.url) this.updateTag('property', 'og:url', options.url);

    this.updateTag('name', 'twitter:card', 'summary_large_image');
    this.updateTag('name', 'twitter:title', fullTitle);
    this.updateTag('name', 'twitter:description', options.description ?? '');
    if (options.image) this.updateTag('name', 'twitter:image', options.image);

    this.updateCanonical(options.url ?? this.document.location.href);
  }

  private updateTag(attr: 'name' | 'property', key: string, content: string): void {
    if (!content) return;
    const selector = `${attr}="${key}"`;
    if (this.meta.getTag(selector)) {
      this.meta.updateTag({ [attr]: key, content });
    } else {
      this.meta.addTag({ [attr]: key, content });
    }
  }

  private updateCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}