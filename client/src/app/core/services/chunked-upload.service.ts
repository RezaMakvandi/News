import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import type { ApiEnvelope } from '../models/api.model';
import type { MediaItem } from '../models/media.model';

/** Size of a single chunk when uploading large files (videos). */
const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB

/** Retries per chunk before the whole upload fails. */
const MAX_RETRIES = 3;

export interface UploadProgress {
  /** Bytes confirmed by the server. */
  loaded: number;
  /** Total bytes of the file. */
  total: number;
}

const unwrap = <T>(response: ApiEnvelope<T>): T => response.data as T;

/**
 * Resumable chunked upload for large files. Sends sequential 4 MB chunks with
 * `PUT /api/admin/media/uploads/:id`, resuming from the server-acknowledged
 * offset after network errors, then finalises with `…/complete`.
 */
@Injectable({ providedIn: 'root' })
export class ChunkedUploadService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/admin/media/uploads';

  upload(
    file: File,
    options: {
      folder?: string;
      alt?: string;
      onProgress?: (progress: UploadProgress) => void;
    } = {},
  ): Observable<MediaItem> {
    return new Observable<MediaItem>((subscriber) => {
      const uploadId = `u${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const url = `${this.base}/${uploadId}`;
      const report = options.onProgress ?? (() => undefined);
      let closed = false;
      let offset = 0;

      const sendChunk = (chunkOffset: number) =>
        this.http.put<ApiEnvelope<{ received: number }>>(
          url,
          file.slice(chunkOffset, chunkOffset + CHUNK_SIZE),
          {
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-File-Size': String(file.size),
              'X-File-Type': file.type || 'video/mp4',
              'X-Silent': 'chunk',
            },
          },
        );

      /** Asks the server how many bytes it already holds (resume support). */
      const syncOffset = (fallback: number, next: (received: number) => void) =>
        this.http
          .get<ApiEnvelope<{ received: number }>>(`${url}/status`, {
            headers: { 'X-Silent': 'chunk' },
          })
          .pipe(
            map((response) => response.data.received),
            catchError(() => of(fallback)),
          )
          .subscribe((received) => next(Math.min(received, file.size)));

      const finish = () => {
        if (closed) return;
        this.complete(uploadId, file, options).subscribe({
          next: (media) => {
            closed = true;
            subscriber.next(media);
            subscriber.complete();
          },
          error: (error) => {
            closed = true;
            subscriber.error(error);
          },
        });
      };

      const step = (attempt: number) => {
        if (closed) return;
        if (offset >= file.size) {
          finish();
          return;
        }
        sendChunk(offset).subscribe({
          next: (response) => {
            if (closed) return;
            offset = Math.min(response.data.received, file.size);
            report({ loaded: offset, total: file.size });
            step(0);
          },
          error: () => {
            if (closed) return;
            if (attempt + 1 >= MAX_RETRIES) {
              closed = true;
              subscriber.error(new Error('بارگذاری ویدیو ناتمام ماند. دوباره تلاش کنید.'));
              return;
            }
            // The failed chunk may have reached the server — re-sync the
            // offset before retrying so nothing is appended twice.
            syncOffset(offset, (received) => {
              if (closed) return;
              offset = received;
              report({ loaded: offset, total: file.size });
              step(attempt + 1);
            });
          },
        });
      };

      syncOffset(0, (received) => {
        offset = received;
        report({ loaded: offset, total: file.size });
        step(0);
      });

      return () => {
        closed = true;
      };
    });
  }

  private complete(
    uploadId: string,
    file: File,
    options: { folder?: string; alt?: string },
  ): Observable<MediaItem> {
    return this.http
      .post<ApiEnvelope<MediaItem>>(
        `${this.base}/${uploadId}/complete`,
        {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          folder: options.folder ?? 'article-videos',
          alt: options.alt ?? '',
        },
        { headers: { 'X-Silent': 'chunk' } },
      )
      .pipe(
        map(unwrap),
        catchError((error: unknown) => {
          void this.http
            .delete(`${this.base}/${uploadId}`, { headers: { 'X-Silent': 'chunk' } })
            .subscribe({ error: () => undefined });
          return this.normalizeError(error);
        }),
      );
  }

  private normalizeError(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string } | null;
      return throwError(() => new Error(body?.message || 'بارگذاری فایل انجام نشد'));
    }
    return throwError(() => new Error('بارگذاری فایل انجام نشد'));
  }
}
