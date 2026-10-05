import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

/** Must match the key read by the pre-boot script in `index.html`. */
const THEME_KEY = 'zoomit-theme';

/**
 * Owns the `data-theme` attribute on `<html>` and the runtime accent colour.
 * The initial value is already applied by the inline script in `index.html`,
 * so this service only keeps Angular state in sync with the DOM.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly modeSignal = signal<ThemeMode>(this.readInitialMode());

  readonly mode = this.modeSignal.asReadonly();

  constructor() {
    this.apply(this.modeSignal());
  }

  toggle(): void {
    this.set(this.modeSignal() === 'dark' ? 'light' : 'dark');
  }

  set(mode: ThemeMode): void {
    this.modeSignal.set(mode);
    this.apply(mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }

  /** Applies the admin-configured accent colour to the `--accent` token. */
  applyAccent(color?: string): void {
    if (!color) return;
    document.documentElement.style.setProperty('--accent', color);
  }

  private apply(mode: ThemeMode): void {
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.style.colorScheme = mode;
  }

  private readInitialMode(): ThemeMode {
    const fromDom = document.documentElement.getAttribute('data-theme');
    if (fromDom === 'light' || fromDom === 'dark') return fromDom;

    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      /* ignore */
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}