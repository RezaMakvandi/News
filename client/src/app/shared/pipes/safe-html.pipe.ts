import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Marks server-sanitised HTML (article bodies, CMS pages, admin replies) as
 * safe for `[innerHTML]`. The backend runs an allow-list sanitiser over all
 * rich-text fields, so the string is already safe to render.
 */
@Pipe({ name: 'safeHtml' })
export class SafeHtmlPipe implements PipeTransform {
  constructor(private readonly sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value ?? '');
  }
}