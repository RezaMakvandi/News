import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  title?: string;
}

const DEFAULT_TITLES: Record<ToastTone, string> = {
  success: 'انجام شد',
  error: 'خطا',
  info: 'اطلاع',
  warning: 'هشدار',
};

/** Lightweight toast queue rendered by the global `<app-toast-container>`. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<Toast[]>([]);
  private nextId = 1;

  readonly toasts = this.items.asReadonly();

  success(message: string, title?: string): void {
    this.push('success', message, title);
  }

  error(message: string, title?: string): void {
    this.push('error', message, title);
  }

  info(message: string, title?: string): void {
    this.push('info', message, title);
  }

  warning(message: string, title?: string): void {
    this.push('warning', message, title);
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((toast) => toast.id !== id));
  }

  clear(): void {
    this.items.set([]);
  }

  private push(tone: ToastTone, message: string, title?: string): void {
    const id = this.nextId++;
    this.items.update((list) => [...list, { id, tone, message, title: title ?? DEFAULT_TITLES[tone] }]);
    setTimeout(() => this.dismiss(id), tone === 'error' ? 6000 : 4000);
  }
}