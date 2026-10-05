import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ThemeService } from './theme.service';
import type { AdminSettingsResponse, Page, PagePayload, PublicSettings, SettingItem } from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly api = inject(ApiService);
  private readonly theme = inject(ThemeService);

  private readonly settingsSignal = signal<PublicSettings>({});
  readonly settings = this.settingsSignal.asReadonly();

  /** GET /api/settings — cached in a signal for header/footer rendering. */
  load(): Observable<PublicSettings> {
    return this.api.get<PublicSettings>('settings').pipe(
      tap((settings) => {
        this.settingsSignal.set(settings ?? {});
        this.theme.applyAccent(settings?.accentColor);
      }),
    );
  }

  /** GET /api/admin/settings */
  adminGet(): Observable<AdminSettingsResponse> {
    return this.api.get<AdminSettingsResponse>('admin/settings');
  }

  /** PUT /api/admin/settings */
  adminSave(items: { key: string; value: unknown }[]): Observable<SettingItem[]> {
    return this.api.put<SettingItem[]>('admin/settings', { items });
  }

  /** GET /api/pages */
  pages(): Observable<Page[]> {
    return this.api.get<Page[]>('pages');
  }

  /** GET /api/pages/:slug */
  page(slug: string): Observable<Page> {
    return this.api.get<Page>(`pages/${slug}`);
  }

  /* -------------------------------- Admin -------------------------------- */

  adminPages(): Observable<Page[]> {
    return this.api.get<Page[]>('admin/pages');
  }

  createPage(payload: PagePayload): Observable<Page> {
    return this.api.post<Page>('admin/pages', payload);
  }

  updatePage(id: string, payload: Partial<PagePayload>): Observable<Page> {
    return this.api.put<Page>(`admin/pages/${id}`, payload);
  }

  deletePage(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/pages/${id}`);
  }
}