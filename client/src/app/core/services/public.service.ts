import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

export interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  body: string;
}

/** Anonymous-facing endpoints: newsletter subscription and the contact form. */
@Injectable({ providedIn: 'root' })
export class PublicService {
  private readonly api = inject(ApiService);

  /** POST /api/subscribers */
  subscribe(email: string): Observable<string> {
    return this.api.postWithMessage<unknown>('subscribers', { email }).pipe(mapMessage);
  }

  /** POST /api/messages */
  sendMessage(payload: ContactPayload): Observable<string> {
    return this.api.postWithMessage<unknown>('messages', payload).pipe(mapMessage);
  }
}

function mapMessage(source: Observable<{ data: unknown; message: string }>): Observable<string> {
  return source.pipe(map((result) => result.message));
}