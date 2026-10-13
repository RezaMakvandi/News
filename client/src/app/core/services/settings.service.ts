import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, of, shareReplay, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ThemeService } from './theme.service';
import type {
  AdminSettingsResponse,
  Page,
  PagePayload,
  PublicSettings,
  SettingItem,
} from '../models/settings.model';
import {
  HOME_LAYOUT_DEFAULT,
  normalizeHomeLayout,
  type HomeSection,
} from '../models/home-layout.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly api = inject(ApiService);
  private readonly theme = inject(ThemeService);

  private readonly settingsSignal = signal<PublicSettings>({});
  readonly settings = this.settingsSignal.asReadonly();

  /** In-flight public settings request, shared across concurrent callers. */
  private load$: Observable<PublicSettings> | null = null;
  private loaded = false;

  /** Ordered home page blocks, falling back to the built-in default layout. */
  readonly homeLayout = computed<HomeSection[]>(() => {
    const configured = normalizeHomeLayout(this.settingsSignal()['homeLayout']);
    return configured.length ? configured : HOME_LAYOUT_DEFAULT;
  });

  /**
   * GET /api/settings — cached in a signal for header/footer rendering.
   * Concurrent callers share one request; pass `forceReload` to refresh.
   */
  load(forceReload = false): Observable<PublicSettings> {
    if (!forceReload && this.loaded) return of(this.settingsSignal());
    if (this.load$) return this.load$;

    this.load$ = this.api.get<PublicSettings>('settings').pipe(
      tap((settings) => {
        this.settingsSignal.set(settings ?? {});
        this.theme.applyAccent(settings?.accentColor);
        this.loaded = true;
      }),
      finalize(() => {
        this.load$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.load$;
  }

  /** GET /api/admin/settings */
  adminGet(): Observable<AdminSettingsResponse> {
    return this.api.get<AdminSettingsResponse>('admin/settings');
  }

  /** PUT /api/admin/settings */
  adminSave(items: { key: string; value: unknown }[]): Observable<SettingItem[]> {
    return this.api.put<SettingItem[]>('admin/settings', { items });
  }

  /** PUT /api/admin/settings — persists the ordered home layout. */
  saveHomeLayout(layout: HomeSection[]): Observable<SettingItem[]> {
    return this.adminSave([{ key: 'homeLayout', value: layout }]);
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
