import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { AuthService, ADMIN_ROLES } from '../../../../core/services/auth.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { AuthUser, UserPayload, UserRole, UserStatus } from '../../../../core/models/user.model';
import { USER_ROLE_LABELS, USER_STATUS_LABELS, USER_STATUS_TONE } from '../../../../core/models/user.model';
import { FaDatePipe, FaNumberPipe } from '../../../../shared/pipes/format.pipe';

const ROLE_TABS = [
  { value: 'all', label: 'همه' },
  { value: 'admin', label: 'مدیر کل' },
  { value: 'editor', label: 'سردبیر' },
  { value: 'author', label: 'نویسنده' },
  { value: 'subscriber', label: 'کاربر عادی' },
];

@Component({
  selector: 'app-users-page',
  imports: [
    FormsModule,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    ConfirmDialogComponent,
    ModalComponent,
    FaDatePipe,
    FaNumberPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>کاربران</h1>
        <p class="text-sm text-muted">مدیریت حساب‌های کاربری و سطح دسترسی.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="openEditor()">
        <app-icon name="plus-circle" [size]="18" />
        کاربر جدید
      </button>
    </div>

    <div class="filter-bar">
      <div class="tabs">
        @for (tab of roleTabs; track tab.value) {
          <button
            type="button"
            class="btn btn-sm"
            [class.btn-primary]="role() === tab.value"
            [class.btn-ghost]="role() !== tab.value"
            (click)="setRole(tab.value)"
          >
            {{ tab.label }}
            @if (roleCounts()[tab.value] !== undefined) {
              <span class="nav-count">{{ roleCounts()[tab.value] | faNumber }}</span>
            }
          </button>
        }
      </div>

      <div class="input-search">
        <app-icon name="search" [size]="16" />
        <input
          class="input"
          type="search"
          placeholder="جستجو در نام یا ایمیل…"
          [ngModel]="searchTerm()" (ngModelChange)="onSearchInput()"
          (input)="onSearchInput()"
        />
      </div>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری کاربران…" />
    } @else if (!users().length) {
      <app-empty-state
        icon="users"
        title="کاربری یافت نشد"
        description="فیلترها را تغییر دهید یا کاربر جدیدی ایجاد کنید."
        actionLabel="ایجاد کاربر"
        actionIcon="plus-circle"
        (action)="openEditor()"
      />
    } @else {
      <div class="table-wrap card">
        <table class="table">
          <thead>
            <tr>
              <th>کاربر</th>
              <th>ایمیل</th>
              <th>سطح دسترسی</th>
              <th>وضعیت</th>
              <th>تعداد مطالب</th>
              <th>آخرین ورود</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            @for (user of users(); track user._id) {
              <tr>
                <td>
                  <div class="cell-user">
                    @if (user.avatar) {
                      <img class="avatar-fallback" [src]="user.avatar" [alt]="user.name" />
                    } @else {
                      <span class="avatar-fallback">{{ user.name.charAt(0) || '؟' }}</span>
                    }
                    <div>
                      <span class="row-title">{{ user.name }}</span>
                      @if (user.bio) {
                        <span class="text-xs text-faint clamp-1">{{ user.bio }}</span>
                      }
                    </div>
                  </div>
                </td>
                <td class="text-sm" dir="ltr">{{ user.email }}</td>
                <td>
                  <span class="badge badge-accent">{{ roleLabel(user.role) }}</span>
                </td>
                <td>
                  <span class="badge" [class]="statusBadge(user.status)">{{ statusLabel(user.status) }}</span>
                </td>
                <td class="text-sm">{{ user.postsCount ?? 0 | faNumber }}</td>
                <td class="text-sm text-muted">{{ user.lastLoginAt ? (user.lastLoginAt | faDate: 'relative') : '—' }}</td>
                <td class="col-actions">
                  <div class="row-actions">
                    <button type="button" class="btn btn-ghost btn-icon btn-sm" (click)="openEditor(user)" aria-label="ویرایش">
                      <app-icon name="edit" [size]="16" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon btn-sm is-danger"
                      (click)="confirmDelete(user)"
                      [disabled]="isSelf(user)"
                      aria-label="حذف"
                    >
                      <app-icon name="trash" [size]="16" />
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="row" style="justify-content: center; margin-top: var(--space-5)">
        <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="goToPage($event)" />
      </div>
    }

    @if (editorOpen()) {
      <app-modal [open]="true" [title]="editing()?._id ? 'ویرایش کاربر' : 'کاربر جدید'" (closed)="editorOpen.set(false)">
        <div class="stack-lg">
          <div class="field">
            <label class="label">نام <span class="req">*</span></label>
            <input class="input" [(ngModel)]="form.name" name="name" placeholder="نام کامل کاربر" />
          </div>

          <div class="field">
            <label class="label">ایمیل <span class="req">*</span></label>
            <input class="input" type="email" dir="ltr" [(ngModel)]="form.email" name="email" placeholder="you@example.com" />
          </div>

          <div class="field">
            <label class="label">گذرواژه {{ editing()?._id ? '(خالی بگذارید اگر نمی‌خواهید تغییر کند)' : '*' }}</label>
            <input class="input" type="password" dir="ltr" [(ngModel)]="form.password" name="password" />
          </div>

          <div class="grid-2">
            <div class="field">
              <label class="label">سطح دسترسی</label>
              <select class="select" [(ngModel)]="form.role" name="role" [disabled]="isSelf(editing())">
                @for (role of roles(); track role) {
                  <option [value]="role">{{ roleLabel(role) }}</option>
                }
              </select>
            </div>

            <div class="field">
              <label class="label">وضعیت</label>
              <select class="select" [(ngModel)]="form.status" name="status" [disabled]="isSelf(editing())">
                @for (status of statuses(); track status) {
                  <option [value]="status">{{ statusLabel(status) }}</option>
                }
              </select>
            </div>
          </div>

          <div class="field">
            <label class="label">بیوگرافی</label>
            <textarea class="textarea" rows="3" [(ngModel)]="form.bio" name="bio"></textarea>
          </div>

          <div class="field">
            <label class="label">تصویر پروفایل</label>
            <input class="input" dir="ltr" [(ngModel)]="form.avatar" name="avatar" placeholder="/uploads/…" />
          </div>
        </div>

        <div modalFooter>
          <button type="button" class="btn btn-ghost" (click)="editorOpen.set(false)">انصراف</button>
          <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner spinner-sm"></span>
            }
            {{ editing()?._id ? 'ذخیره تغییرات' : 'ایجاد کاربر' }}
          </button>
        </div>
      </app-modal>
    }

    <app-confirm-dialog
      [open]="confirmOpen()"
      title="حذف کاربر"
      [message]="deleteMessage()"
      [busy]="deleting()"
      (confirm)="performDelete()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
  styles: `
    .cell-user {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .avatar-fallback {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-full);
      display: grid;
      place-items: center;
      background: var(--accent-soft);
      color: var(--accent);
      font-weight: 700;
      font-size: 0.875rem;
      flex: none;
    }

    .avatar-fallback img {
      width: 100%;
      height: 100%;
      border-radius: inherit;
      object-fit: cover;
    }
  `,
})
export class UsersPage {
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly roleTabs = ROLE_TABS;

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly users = signal<AuthUser[]>([]);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly roleCounts = signal<Record<string, number>>({});

  protected readonly role = signal('all');
  protected readonly searchTerm = signal('');

  protected readonly editorOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly editing = signal<AuthUser | null>(null);
  protected readonly deleteTarget = signal<AuthUser | null>(null);

  protected readonly form = {
    name: '',
    email: '',
    password: '',
    role: 'author' as UserRole,
    status: 'active' as UserStatus,
    bio: '',
    avatar: '',
  };

  constructor() {
    this.seo.set({ title: 'کاربران | پنل مدیریت' });
    this.load();
  }

  protected setRole(value: string): void {
    this.role.set(value);
    this.page.set(1);
    this.load();
  }

  protected onSearchInput(): void {
    this.page.set(1);
    this.load();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected openEditor(user?: AuthUser): void {
    this.editing.set(user ?? null);
    this.form.name = user?.name ?? '';
    this.form.email = user?.email ?? '';
    this.form.password = '';
    this.form.role = user?.role ?? 'author';
    this.form.status = user?.status ?? 'active';
    this.form.bio = user?.bio ?? '';
    this.form.avatar = user?.avatar ?? '';
    this.editorOpen.set(true);
  }

  protected save(): void {
    if (!this.form.name.trim()) {
      this.toast.warning('نام کاربر را وارد کنید');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) {
      this.toast.warning('ایمیل معتبر نیست');
      return;
    }

    this.saving.set(true);
    const payload: Partial<UserPayload> = {
      name: this.form.name.trim(),
      email: this.form.email.trim(),
      role: this.form.role,
      status: this.form.status,
      bio: this.form.bio,
      avatar: this.form.avatar,
    };
    if (this.form.password) payload.password = this.form.password;

    const editing = this.editing();
    const request = editing
      ? this.authService.updateUser(editing._id!, payload)
      : this.authService.createUser(payload as UserPayload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.toast.success(editing ? 'کاربر به‌روزرسانی شد' : 'کاربر ایجاد شد');
        this.load();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.error(error.message || 'ذخیره انجام نشد');
      },
    });
  }

  protected confirmDelete(user: AuthUser): void {
    if (this.isSelf(user)) return;
    this.deleteTarget.set(user);
    this.confirmOpen.set(true);
  }

  protected deleteMessage(): string {
    const user = this.deleteTarget();
    return user ? `کاربر «${user.name}» برای همیشه حذف می‌شود.` : '';
  }

  protected performDelete(): void {
    const user = this.deleteTarget();
    if (!user) return;

    this.deleting.set(true);
    this.authService.deleteUser(user._id!).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmOpen.set(false);
        this.toast.success('کاربر حذف شد');
        this.load();
      },
      error: (error: Error) => {
        this.deleting.set(false);
        this.toast.error(error.message || 'حذف انجام نشد');
      },
    });
  }

  protected isSelf(user: AuthUser | null): boolean {
    return Boolean(user && this.authService.currentUser()?.id === user._id);
  }

  protected roleLabel(role: UserRole): string {
    return USER_ROLE_LABELS[role] ?? role;
  }

  protected statusLabel(status: UserStatus): string {
    return USER_STATUS_LABELS[status] ?? status;
  }

  protected statusBadge(status: UserStatus): string {
    return USER_STATUS_TONE[status] ?? 'badge';
  }

  protected roles(): UserRole[] {
    return ['admin', 'editor', 'author', 'subscriber'];
  }

  protected statuses(): UserStatus[] {
    return ['active', 'pending', 'suspended'];
  }

  private load(): void {
    this.loading.set(true);
    this.authService
      .listUsers({
        page: this.page(),
        limit: 20,
        role: this.role() === 'all' ? undefined : this.role(),
        q: this.searchTerm().trim(),
      })
      .subscribe({
        next: (result) => {
          this.users.set(result.items ?? []);
          this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
          this.roleCounts.set(result.meta?.roleCounts ?? {});
          this.loading.set(false);
        },
        error: () => {
          this.users.set([]);
          this.loading.set(false);
        },
      });
  }
}