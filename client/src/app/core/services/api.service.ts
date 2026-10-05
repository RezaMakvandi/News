import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import type { ApiEnvelope, ApiList, MetaResult, StatusCountsMeta } from '../models/api.model';

/** Query values accepted by `buildParams` — arrays become repeated params. */
export type QueryValue = string | number | boolean | null | undefined | (string | number)[];

export interface RequestOptions {
  params?: Record<string, QueryValue>;
  /** Emits the server `meta` object alongside the payload. */
  withMeta?: boolean;
}

/**
 * Thin wrapper over HttpClient that unwraps the backend `{ success, data, meta }`
 * envelope and normalises errors into a plain Persian message.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  /** GET returning only `data`. */
  get<T>(path: string, options: RequestOptions = {}): Observable<T> {
    return this.http
      .get<ApiEnvelope<T>>(this.url(path), { params: buildParams(options.params) })
      .pipe(map(unwrap), catchError(this.handleError));
  }

  /** GET returning `{ data, meta }` remapped to an items-list shape. */
  getListWithMeta<T>(
    path: string,
    options: RequestOptions = {},
  ): Observable<{ items: T[]; meta: StatusCountsMeta }> {
    return this.getWithMeta<T[]>(path, options).pipe(
      map((result) => ({ items: result.data ?? [], meta: result.meta })),
    );
  }

  /** GET returning `{ data, meta }` for paginated lists. */
  getWithMeta<T>(path: string, options: RequestOptions = {}): Observable<MetaResult<T>> {
    return this.http
      .get<ApiEnvelope<T>>(this.url(path), { params: buildParams(options.params) })
      .pipe(
        map((response) => ({ data: unwrap(response), meta: response.meta ?? emptyMeta() })),
        catchError(this.handleError),
      );
  }

  /** GET a paginated list, falling back to an empty page when `meta` is absent. */
  getList<T>(path: string, options: RequestOptions = {}): Observable<ApiList<T>> {
    return this.getWithMeta<T[]>(path, options).pipe(
      map((result) => ({ items: result.data ?? [], meta: result.meta })),
    );
  }

  post<T>(path: string, body: unknown = {}, options: RequestOptions = {}): Observable<T> {
    return this.http
      .post<ApiEnvelope<T>>(this.url(path), body, { params: buildParams(options.params) })
      .pipe(map(unwrap), catchError(this.handleError));
  }

  /** POST where the success message itself matters (newsletter, contact form). */
  postWithMessage<T>(path: string, body: unknown = {}): Observable<{ data: T; message: string }> {
    return this.http.post<ApiEnvelope<T>>(this.url(path), body).pipe(
      map((response) => ({ data: unwrap(response), message: response.message ?? 'عملیات با موفقیت انجام شد' })),
      catchError(this.handleError),
    );
  }

  put<T>(path: string, body: unknown = {}, options: RequestOptions = {}): Observable<T> {
    return this.http
      .put<ApiEnvelope<T>>(this.url(path), body, { params: buildParams(options.params) })
      .pipe(map(unwrap), catchError(this.handleError));
  }

  patch<T>(path: string, body: unknown = {}, options: RequestOptions = {}): Observable<T> {
    return this.http
      .patch<ApiEnvelope<T>>(this.url(path), body, { params: buildParams(options.params) })
      .pipe(map(unwrap), catchError(this.handleError));
  }

  delete<T>(path: string, options: RequestOptions = {}): Observable<T> {
    return this.http
      .delete<ApiEnvelope<T>>(this.url(path), { params: buildParams(options.params) })
      .pipe(map(unwrap), catchError(this.handleError));
  }

  /** Uploads files as multipart form data to the media endpoint. */
  upload<T>(path: string, files: File[], extra: Record<string, string> = {}): Observable<T> {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    Object.entries(extra).forEach(([key, value]) => form.append(key, value));

    return this.http
      .post<ApiEnvelope<T>>(this.url(path), form)
      .pipe(map(unwrap), catchError(this.handleError));
  }

  private url(path: string): string {
    return `${this.base}/${path.replace(/^\/+/, '')}`;
  }

  private handleError = (error: unknown): Observable<never> => {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string; details?: Record<string, string> } | null;
      const details = body?.details ? Object.values(body.details).join('، ') : '';

      let message = body?.message ?? details;
      if (!message) {
        if (error.status === 0) message = 'ارتباط با سرور برقرار نشد. اتصال اینترنت یا سرور را بررسی کنید.';
        else if (error.status === 401) message = 'برای انجام این عملیات باید وارد حساب خود شوید.';
        else if (error.status === 403) message = 'شما به این بخش دسترسی ندارید.';
        else if (error.status === 404) message = 'موردی که درخواست کردید یافت نشد.';
        else if (error.status === 429) message = 'تعداد درخواست‌ها زیاد است. کمی بعد تلاش کنید.';
        else message = 'خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.';
      }

      return throwError(() => Object.assign(new Error(message), { status: error.status }));
    }

    return throwError(() => new Error('خطای غیرمنتظره‌ای رخ داد.'));
  };
}

const unwrap = <T>(response: ApiEnvelope<T>): T => response?.data as T;

const emptyMeta = (): StatusCountsMeta => ({
  total: 0,
  page: 1,
  limit: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
});

/** Serialises a query object, dropping empty values. */
export function buildParams(params?: Record<string, QueryValue>): HttpParams {
  let httpParams = new HttpParams();
  if (!params) return httpParams;

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== null && item !== undefined && item !== '') {
          httpParams = httpParams.append(key, String(item));
        }
      });
      return;
    }
    httpParams = httpParams.set(key, String(value));
  });

  return httpParams;
}