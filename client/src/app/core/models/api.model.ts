/** Shared API envelope types — mirrors the backend `respond.ts` helpers. */

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface StatusCountsMeta extends PageMeta {
  statusCounts?: Record<string, number>;
  roleCounts?: Record<string, number>;
  folders?: string[];
  unread?: number;
}

/** Server success envelope: `{ success, data, message?, meta? }`. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: StatusCountsMeta;
}

/** Server error envelope: `{ success: false, message, details? }`. */
export interface ApiErrorEnvelope {
  success: false;
  message: string;
  details?: Record<string, string>;
}

export type PaginationMeta = PageMeta;

export interface ApiList<T> {
  items: T[];
  meta: StatusCountsMeta;
}

/** Raw paginated result from `ApiService.getWithMeta`, awaiting remapping. */
export interface MetaResult<T> {
  data: T;
  meta: StatusCountsMeta;
}