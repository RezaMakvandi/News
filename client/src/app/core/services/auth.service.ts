import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import type { AuthUser, LoginResponse, UserRole, UserPayload } from '../models/user.model';
import type { PageMeta } from '../models/api.model';
import { ToastService } from './toast.service';

const TOKEN_KEY = 'zoomit-token';
const USER_KEY = 'zoomit-user';

/** Roles allowed into the admin panel — mirrors the backend `STAFF_ROLES`. */
export const STAFF_ROLES: UserRole[] = ['admin', 'editor', 'author'];
export const ADMIN_ROLES: UserRole[] = ['admin', 'editor'];

export interface ProfilePayload {
  name?: string;
  bio?: string;
  avatar?: string;
}

export interface UserQuery {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  q?: string;
  sort?: string;
}

export interface UserListResult {
  items: AuthUser[];
  meta: PageMeta & { roleCounts?: Record<string, number> };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  private readonly tokenSignal = signal<string | null>(readStorage(TOKEN_KEY));
  private readonly userSignal = signal<AuthUser | null>(readJson<AuthUser>(USER_KEY));

  readonly token = this.tokenSignal.asReadonly();
  readonly currentUser = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => Boolean(this.tokenSignal()));
  readonly role = computed<UserRole | null>(() => this.userSignal()?.role ?? null);
  readonly isStaff = computed(() => STAFF_ROLES.includes(this.role() as UserRole));
  readonly isAdmin = computed(() => ADMIN_ROLES.includes(this.role() as UserRole));
  readonly displayName = computed(() => this.userSignal()?.name ?? '');

  /** POST /api/auth/login */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/login', { email, password }).pipe(
      tap((result) => this.persist(result)),
    );
  }

  /** POST /api/auth/register — public sign-up creates a subscriber. */
  register(name: string, email: string, password: string): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/register', { name, email, password }).pipe(
      tap((result) => this.persist(result)),
    );
  }

  /** GET /api/auth/me — refreshes the cached profile. */
  refresh(): Observable<AuthUser> {
    return this.api.get<AuthUser>('auth/me').pipe(tap((user) => this.setUser(user)));
  }

  /** PUT /api/auth/me */
  updateProfile(payload: ProfilePayload): Observable<AuthUser> {
    return this.api.put<AuthUser>('auth/me', payload).pipe(tap((user) => this.setUser(user)));
  }

  /** PUT /api/auth/password */
  changePassword(currentPassword: string, newPassword: string): Observable<null> {
    return this.api.put<null>('auth/password', { currentPassword, newPassword });
  }

  logout(redirect = true): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    removeStorage(TOKEN_KEY);
    removeStorage(USER_KEY);
    if (redirect) this.toast.info('از حساب خود خارج شدید.');
  }

  /* ------------------------------ Admin users ---------------------------- */

  /** GET /api/admin/users */
  listUsers(query: UserQuery = {}): Observable<UserListResult> {
    return this.api.getListWithMeta<AuthUser>('admin/users', { params: { ...query } });
  }

  /** POST /api/admin/users */
  createUser(payload: UserPayload): Observable<AuthUser> {
    return this.api.post<AuthUser>('admin/users', payload);
  }

  /** PUT /api/admin/users/:id */
  updateUser(id: string, payload: Partial<UserPayload>): Observable<AuthUser> {
    return this.api.put<AuthUser>(`admin/users/${id}`, payload);
  }

  /** PATCH /api/admin/users/:id/status */
  updateUserStatus(id: string, status: string): Observable<AuthUser> {
    return this.api.patch<AuthUser>(`admin/users/${id}/status`, { status });
  }

  /** DELETE /api/admin/users/:id */
  deleteUser(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`admin/users/${id}`);
  }

  getUser(id: string): Observable<AuthUser> {
    return this.api.get<AuthUser>(`admin/users/${id}`);
  }

  /* -------------------------------- Internals ---------------------------- */

  private persist(result: LoginResponse): void {
    this.tokenSignal.set(result.token);
    writeStorage(TOKEN_KEY, result.token);
    this.setUser(result.user);
  }

  private setUser(user: AuthUser): void {
    this.userSignal.set(user);
    writeStorage(USER_KEY, JSON.stringify(user));
  }
}

/* --------------------------- storage helpers ---------------------------- */

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode) — session stays in memory only */
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function readJson<T>(key: string): T | null {
  const raw = readStorage(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    removeStorage(key);
    return null;
  }
}