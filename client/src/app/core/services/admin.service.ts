import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { PageMeta } from '../models/api.model';
import type { ContactMessage, MessageStatus, Subscriber } from '../models/settings.model';
import type { RecentActivity, StatsCharts, StatsOverview } from '../models/stats.model';

export interface SubscriberList {
  items: Subscriber[];
  meta: PageMeta;
}

export interface MessageList {
  items: ContactMessage[];
  meta: PageMeta & { unread?: number };
}

/** SMTP configuration summary exposed to the admin panel (no secrets). */
export interface MailStatus {
  configured: boolean;
  hasAdminEmail: boolean;
  adminEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  hasPassword: boolean;
  passwordLength: number;
  ready: boolean;
  warning: string;
}

/** Admin-only resources: subscribers, contact messages and dashboard statistics. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  /* ----------------------------- Subscribers ----------------------------- */

  /** GET /api/admin/subscribers */
  subscribers(
    query: { page?: number; limit?: number; q?: string; active?: string } = {},
  ): Observable<SubscriberList> {
    return this.api.getListWithMeta<Subscriber>('admin/subscribers', { params: { ...query } });
  }

  /** PUT /api/admin/subscribers/:id */
  updateSubscriber(
    id: string,
    payload: { isActive?: boolean; name?: string },
  ): Observable<Subscriber> {
    return this.api.put<Subscriber>(`admin/subscribers/${id}`, payload);
  }

  /** DELETE /api/admin/subscribers/:id */
  deleteSubscriber(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/subscribers/${id}`);
  }

  /* ------------------------------- Messages ------------------------------ */

  /** GET /api/admin/messages */
  messages(
    query: { page?: number; limit?: number; status?: string; q?: string } = {},
  ): Observable<MessageList> {
    return this.api.getListWithMeta<ContactMessage>('admin/messages', { params: { ...query } });
  }

  /** PUT /api/admin/messages/:id */
  updateMessage(
    id: string,
    payload: { status?: MessageStatus; reply?: string },
  ): Observable<ContactMessage> {
    return this.api.put<ContactMessage>(`admin/messages/${id}`, payload);
  }

  /** PUT /api/admin/messages/:id — writes a reply and emails the sender. */
  replyToMessage(id: string, reply: string): Observable<{ data: ContactMessage; message: string }> {
    return this.api.putWithMessage<ContactMessage>(`admin/messages/${id}`, { reply });
  }

  /** DELETE /api/admin/messages/:id */
  deleteMessage(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/messages/${id}`);
  }

  /* --------------------------------- Mail -------------------------------- */

  /** GET /api/admin/mail/status */
  mailStatus(): Observable<MailStatus> {
    return this.api.get<MailStatus>('admin/mail/status');
  }

  /** POST /api/admin/mail/test — sends a test email to verify SMTP. */
  sendTestMail(email?: string): Observable<null> {
    return this.api.post<null>('admin/mail/test', { email });
  }

  /* -------------------------------- Stats -------------------------------- */

  /** GET /api/admin/stats/overview */
  overview(): Observable<StatsOverview> {
    return this.api.get<StatsOverview>('admin/stats/overview');
  }

  /** GET /api/admin/stats/charts */
  charts(): Observable<StatsCharts> {
    return this.api.get<StatsCharts>('admin/stats/charts');
  }

  /** GET /api/admin/stats/recent */
  recent(): Observable<RecentActivity> {
    return this.api.get<RecentActivity>('admin/stats/recent');
  }
}
