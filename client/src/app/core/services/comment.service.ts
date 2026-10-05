import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { PageMeta } from '../models/api.model';
import type {
  ArticleCommentsResponse,
  Comment,
  CommentPayload,
  CommentQuery,
  CommentStatus,
} from '../models/comment.model';

export type CommentBulkAction = 'approve' | 'reject' | 'spam' | 'delete';

export interface AdminCommentList {
  items: Comment[];
  meta: PageMeta & { statusCounts?: Record<string, number> };
}

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly api = inject(ApiService);

  /* ------------------------------- Public -------------------------------- */

  /** GET /api/articles/:slug/comments — approved comments as a reply tree. */
  forArticle(slug: string): Observable<ArticleCommentsResponse> {
    return this.api.get<ArticleCommentsResponse>(`articles/${slug}/comments`);
  }

  /** POST /api/articles/:slug/comments */
  submit(slug: string, payload: CommentPayload): Observable<{ id: string; status: CommentStatus }> {
    return this.api.post<{ id: string; status: CommentStatus }>(`articles/${slug}/comments`, payload);
  }

  /** POST /api/comments/:id/vote */
  vote(id: string, type: 'like' | 'dislike'): Observable<{ likes: number; dislikes: number }> {
    return this.api.post<{ likes: number; dislikes: number }>(`comments/${id}/vote`, { type });
  }

  /* -------------------------------- Admin -------------------------------- */

  /** GET /api/admin/comments */
  adminList(query: CommentQuery = {}): Observable<AdminCommentList> {
    return this.api.getListWithMeta<Comment>('admin/comments', { params: { ...query } });
  }

  /** PATCH /api/admin/comments/:id/status */
  updateStatus(id: string, status: CommentStatus): Observable<Comment> {
    return this.api.patch<Comment>(`admin/comments/${id}/status`, { status });
  }

  /** PUT /api/admin/comments/:id/reply */
  reply(id: string, adminReply: string, status?: CommentStatus): Observable<Comment> {
    return this.api.put<Comment>(`admin/comments/${id}/reply`, { adminReply, status });
  }

  /** PUT /api/admin/comments/:id */
  update(id: string, content: string): Observable<Comment> {
    return this.api.put<Comment>(`admin/comments/${id}`, { content });
  }

  /** DELETE /api/admin/comments/:id */
  remove(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/comments/${id}`);
  }

  /** POST /api/admin/comments/bulk */
  bulk(ids: string[], action: CommentBulkAction): Observable<{ affected: number }> {
    return this.api.post<{ affected: number }>('admin/comments/bulk', { ids, action });
  }
}