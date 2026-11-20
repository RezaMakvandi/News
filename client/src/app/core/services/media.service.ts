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

  /** GET /api/admin/media/folders — list created folders. */
  listFolders(): Observable<{ _id: string; name: string }[]> {
    return this.api.get<{ _id: string; name: string }[]>('admin/media/folders');
  }

  /** POST /api/admin/media/folders — create a folder with a custom name (admin only). */
  createFolder(name: string): Observable<{ _id: string; name: string; folder?: string }> {
    return this.api.post<{ _id: string; name: string; folder?: string }>('admin/media/folders', { name });
  }

  /** PUT /api/admin/media/folders/:id — rename a folder (admin only). */
  updateFolder(id: string, name: string): Observable<{ _id: string; name: string; folder?: string }> {
    return this.api.put<{ _id: string; name: string; folder?: string }>(`admin/media/folders/${id}`, { name });
  }

  /** DELETE /api/admin/media/folders/:id */
  removeFolder(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/media/folders/${id}`);
  }
}