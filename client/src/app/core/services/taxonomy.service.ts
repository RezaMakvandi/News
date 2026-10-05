import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ApiList } from '../models/api.model';
import type { Category, CategoryPayload, Tag, TagPayload } from '../models/taxonomy.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly api = inject(ApiService);

  /** GET /api/categories — `all=true` includes inactive categories (staff only). */
  list(all = false): Observable<Category[]> {
    return this.api.get<Category[]>('categories', { params: all ? { all: true } : {} });
  }

  /** GET /api/categories/:slug */
  bySlug(slug: string): Observable<Category> {
    return this.api.get<Category>(`categories/${slug}`);
  }

  /* -------------------------------- Admin -------------------------------- */

  adminList(): Observable<Category[]> {
    return this.api.get<Category[]>('admin/categories');
  }

  create(payload: CategoryPayload): Observable<Category> {
    return this.api.post<Category>('admin/categories', payload);
  }

  update(id: string, payload: Partial<CategoryPayload>): Observable<Category> {
    return this.api.put<Category>(`admin/categories/${id}`, payload);
  }

  remove(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/categories/${id}`);
  }

  /** POST /api/admin/categories/reorder */
  reorder(items: { id: string; order: number }[]): Observable<Category[]> {
    return this.api.post<Category[]>('admin/categories/reorder', { items });
  }
}

@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly api = inject(ApiService);

  /** GET /api/tags */
  list(query: { page?: number; limit?: number; q?: string; sort?: string } = {}): Observable<ApiList<Tag>> {
    return this.api.getList<Tag>('tags', { params: { ...query } });
  }

  /** GET /api/tags/popular */
  popular(limit = 20): Observable<Tag[]> {
    return this.api.get<Tag[]>('tags/popular', { params: { limit } });
  }

  /* -------------------------------- Admin -------------------------------- */

  adminList(query: { page?: number; limit?: number; q?: string } = {}): Observable<ApiList<Tag>> {
    return this.api.getList<Tag>('admin/tags', { params: { ...query } });
  }

  create(payload: TagPayload): Observable<Tag> {
    return this.api.post<Tag>('admin/tags', payload);
  }

  update(id: string, payload: Partial<TagPayload>): Observable<Tag> {
    return this.api.put<Tag>(`admin/tags/${id}`, payload);
  }

  remove(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/tags/${id}`);
  }
}