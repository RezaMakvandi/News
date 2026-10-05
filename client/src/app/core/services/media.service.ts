import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { PageMeta } from '../models/api.model';
import type { MediaItem, MediaQuery } from '../models/media.model';

export interface MediaList {
  items: MediaItem[];
  meta: PageMeta & { folders?: string[] };
}

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly api = inject(ApiService);

  /** GET /api/admin/media */
  list(query: MediaQuery = {}): Observable<MediaList> {
    return this.api.getListWithMeta<MediaItem>('admin/media', { params: { ...query } });
  }

  /** POST /api/admin/media — multipart upload, up to 12 files per request. */
  upload(files: File[], folder = 'general'): Observable<MediaItem[]> {
    return this.api.upload<MediaItem[]>('admin/media', files, { folder });
  }

  /** PUT /api/admin/media/:id */
  update(id: string, payload: { alt?: string; folder?: string }): Observable<MediaItem> {
    return this.api.put<MediaItem>(`admin/media/${id}`, payload);
  }

  /** DELETE /api/admin/media/:id */
  remove(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/media/${id}`);
  }
}