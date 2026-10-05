import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ApiList, PageMeta, StatusCountsMeta } from '../models/api.model';
import type { AuthorProfile } from '../models/user.model';
import type {
  Article,
  ArticleCard,
  ArticleDetailResponse,
  ArticlePayload,
  ArticleQuery,
  HeadlinesResponse,
  NeighborsResponse,
} from '../models/article.model';

export interface AdminArticleQuery {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  q?: string;
  author?: string;
  sort?: 'newest' | 'oldest' | 'views' | 'title';
}

export type BulkAction = 'publish' | 'archive' | 'draft' | 'delete';

export interface AdminArticleList {
  items: Article[];
  meta: PageMeta & { statusCounts?: Record<string, number> };
}

@Injectable({ providedIn: 'root' })
export class ArticleService {
  private readonly api = inject(ApiService);

  /* ------------------------------- Public -------------------------------- */

  /** GET /api/articles */
  list(query: ArticleQuery = {}): Observable<ApiList<ArticleCard>> {
    return this.api.getList<ArticleCard>('articles', { params: { ...query } });
  }

  /** GET /api/articles/headlines — hero, breaking, featured and latest blocks. */
  headlines(): Observable<HeadlinesResponse> {
    return this.api.get<HeadlinesResponse>('articles/headlines');
  }

  /** GET /api/articles/popular */
  popular(limit = 6): Observable<ArticleCard[]> {
    return this.api.get<ArticleCard[]>('articles/popular', { params: { limit } });
  }

  /** GET /api/articles/:slug — also increments the view counter server-side. */
  bySlug(slug: string): Observable<ArticleDetailResponse> {
    return this.api.get<ArticleDetailResponse>(`articles/${slug}`);
  }

  /** GET /api/articles/:slug/neighbors */
  neighbors(slug: string): Observable<NeighborsResponse> {
    return this.api.get<NeighborsResponse>(`articles/${slug}/neighbors`);
  }

  /** POST /api/articles/:slug/like */
  like(slug: string): Observable<{ likes: number }> {
    return this.api.post<{ likes: number }>(`articles/${slug}/like`);
  }

    /** GET /api/authors/:slug — public author profile. */
    author(slug: string): Observable<AuthorProfile> {
      return this.api.get<AuthorProfile>(`authors/${slug}`);
    }

  /* -------------------------------- Admin -------------------------------- */

  /** GET /api/admin/articles */
  adminList(query: AdminArticleQuery = {}): Observable<AdminArticleList> {
    return this.api.getListWithMeta<Article>('admin/articles', { params: { ...query } });
  }

  /** GET /api/admin/articles/:id */
  adminGet(id: string): Observable<Article> {
    return this.api.get<Article>(`admin/articles/${id}`);
  }

  /** POST /api/admin/articles */
  create(payload: ArticlePayload): Observable<Article> {
    return this.api.post<Article>('admin/articles', payload);
  }

  /** PUT /api/admin/articles/:id */
  update(id: string, payload: Partial<ArticlePayload>): Observable<Article> {
    return this.api.put<Article>(`admin/articles/${id}`, payload);
  }

  /** PATCH /api/admin/articles/:id/status */
  updateStatus(id: string, status: string): Observable<Article> {
    return this.api.patch<Article>(`admin/articles/${id}/status`, { status });
  }

  /** DELETE /api/admin/articles/:id */
  remove(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/articles/${id}`);
  }

  /** POST /api/admin/articles/bulk */
  bulk(ids: string[], action: BulkAction): Observable<{ affected: number }> {
    return this.api.post<{ affected: number }>('admin/articles/bulk', { ids, action });
  }
}

export type { StatusCountsMeta };