export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'spam';

/** Article reference populated onto admin comment rows. */
export interface CommentArticleRef {
  _id: string;
  title: string;
  slug: string;
}

export interface Comment {
  _id: string;
  article: CommentArticleRef | string;
  author?: string | null;
  parent?: string | null;
  authorName: string;
  authorEmail: string;
  content: string;
  status: CommentStatus;
  likes: number;
  dislikes: number;
  ip?: string;
  userAgent?: string;
  isEdited: boolean;
  adminReply?: string;
  moderatedBy?: { _id: string; name: string } | string | null;
  moderatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Nested tree node returned by the public comments endpoint. */
export interface CommentNode extends Comment {
  replies: CommentNode[];
}

export interface ArticleCommentsResponse {
  comments: CommentNode[];
  allowComments: boolean;
}

export interface CommentPayload {
  content: string;
  parent?: string | null;
  name?: string;
  email?: string;
}

export interface CommentQuery {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
  article?: string;
}

export const COMMENT_STATUS_LABELS: Record<CommentStatus, string> = {
  pending: 'در انتظار تأیید',
  approved: 'تأیید شده',
  rejected: 'رد شده',
  spam: 'اسپم',
};

export const COMMENT_STATUS_TONE: Record<CommentStatus, string> = {
  pending: 'badge badge-warning',
  approved: 'badge badge-success',
  rejected: 'badge badge-danger',
  spam: 'badge',
};