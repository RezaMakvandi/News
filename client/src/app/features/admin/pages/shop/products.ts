import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ShopService } from '../../../../core/services/shop.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import {
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUS_TONE,
  type Product,
  type ProductCategory,
} from '../../../../core/models/product.model';
import { asBrand, asProductCategory, finalPrice } from '../../../../core/utils/shop';

@Component({
  selector: 'app-admin-products',
  imports: [
    FormsModule,
    RouterLink,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    ConfirmDialogComponent,
    FaNumberPipe,
    NgClass,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>محصولات فروشگاه</h1>
        <p class="text-sm text-muted">مدیریت کاتالوگ، قیمت و موجودی محصولات.</p>
      </div>
      <a class="btn btn-primary" routerLink="/admin/shop/products/new">
        <app-icon name="plus-circle" [size]="18" /> محصول جدید
      </a>
    </div>

    <div class="filter-bar">
      <div class="input-search">
        <app-icon name="search" [size]="16" />
        <input
          class="input"
          type="search"
          placeholder="جستجوی نام یا کد کالا..."
          [(ngModel)]="searchTerm"
          (input)="onSearch()"
        />
      </div>
      <select
        class="select"
        style="width:170px"
        [ngModel]="statusFilter()"
        (ngModelChange)="setStatus($event)"
      >
        <option value="all">همه وضعیتها</option>
        <option value="published">منتشر شده</option>
        <option value="draft">پیشنویس</option>
        <option value="archived">بایگانی</option>
      </select>
      <select
        class="select"
        style="width:190px"
        [ngModel]="categoryFilter()"
        (ngModelChange)="setCategory($event)"
      >
        <option value="all">همه دسته ها</option>
        @for (category of categories(); track category._id) {
          <option [value]="category._id">{{ category.name }}</option>
        }
      </select>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری محصولات..." />
    } @else if (!products().length) {
      <app-empty-state
        icon="package"
        title="محصولی یافت نشد"
        description="محصول جدیدی ایجاد کنید یا فیلترها را تغییر دهید."
        actionLabel="محصول جدید"
        actionIcon="plus-circle"
        (action)="goNew()"
      />
    } @else {
      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th style="width:36px">
                  <input type="checkbox" [checked]="allSelected()" (change)="toggleAll()" />
                </th>
                <th>محصول</th>
                <th>دسته / برند</th>
                <th>قیمت</th>
                <th>موجودی</th>
                <th>وضعیت</th>
                <th style="width:150px">عملیات</th>
              </tr>
            </thead>
            <tbody>
              @for (product of products(); track product._id) {
                <tr>
                  <td>
                    <input
                      type="checkbox"
                      [checked]="selected().has(product._id)"
                      (change)="toggleSelect(product._id)"
                    />
                  </td>
                  <td>
                    <div class="row" style="gap:var(--space-3)">
                      @if (product.cover) {
                        <img
                          [src]="product.cover"
                          [alt]="product.name"
                          style="width:44px;height:44px;object-fit:cover;border-radius:var(--radius-xs)"
                        />
                      }
                      <div>
                        <a
                          [routerLink]="['/admin/shop/products', product._id, 'edit']"
                          style="font-weight:700"
                          >{{ product.name }}</a
                        >
                        @if (product.sku) {
                          <p class="text-xs text-muted" dir="ltr">{{ product.sku }}</p>
                        }
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="text-sm">{{ categoryName(product) }}</span>
                    @if (brandName(product)) {
                      <p class="text-xs text-muted">{{ brandName(product) }}</p>
                    }
                  </td>
                  <td>
                    <strong>{{ finalPrice(product) | faNumber }}</strong>
                    @if (product.discountPercent > 0) {
                      <p class="text-xs text-muted" style="text-decoration:line-through">
                        {{ product.price | faNumber }}
                      </p>
                    }
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-danger]="product.stock === 0"
                      [class.badge-warning]="product.stock > 0 && product.stock <= 5"
                    >
                      {{ product.stock | faNumber }}
                    </span>
                  </td>
                  <td>
                    <span [ngClass]="statusTone(product.status)">{{
                      statusLabel(product.status)
                    }}</span>
                  </td>
                  <td>
                    <div class="row" style="gap:4px">
                      <a
                        class="btn btn-ghost btn-icon"
                        [routerLink]="['/admin/shop/products', product._id, 'edit']"
                        aria-label="ویرایش"
                      >
                        <app-icon name="edit" [size]="16" />
                      </a>
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon"
                        (click)="confirmDelete(product)"
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
      </div>

      @if (selected().size > 0) {
        <div class="bulk-bar">
          <span>{{ selected().size | faNumber }} مورد انتخاب شده</span>
          <div class="row" style="gap:var(--space-2)">
            <button type="button" class="btn btn-sm btn-success-soft" (click)="bulk('publish')">
              انتشار
            </button>
            <button type="button" class="btn btn-sm btn-soft" (click)="bulk('draft')">
              پیشنویس
            </button>
            <button type="button" class="btn btn-sm btn-danger-soft" (click)="bulk('delete')">
              حذف
            </button>
          </div>
        </div>
      }

      <div class="row" style="justify-content:center;margin-top:var(--space-4)">
        <app-pagination
          [page]="page()"
          [totalPages]="totalPages()"
          (pageChange)="goToPage($event)"
        />
      </div>
    }

    <app-confirm-dialog
      [open]="confirmOpen()"
      title="حذف محصول"
      [message]="deleteMessage()"
      [busy]="deleting()"
      (confirm)="performDelete()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
  styles: `
    .bulk-bar {
      position: sticky;
      bottom: var(--space-4);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-top: var(--space-4);
      padding: var(--space-3) var(--space-4);
      background: var(--surface);
      border: 1px solid var(--accent);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
    }
  `,
})
export class AdminProductsPage {
  private readonly shop = inject(ShopService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  protected readonly products = signal<Product[]>([]);
  protected readonly categories = signal<ProductCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly statusFilter = signal('all');
  protected readonly categoryFilter = signal('all');
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly confirmOpen = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteTarget = signal<Product | null>(null);

  protected searchTerm = '';

  constructor() {
    this.seo.set({ title: 'محصولات | پنل مدیریت' });
    this.shop
      .categories(true)
      .subscribe({ next: (list) => this.categories.set(list ?? []), error: () => undefined });
    this.load();
  }

  protected statusLabel(status: Product['status']): string {
    return PRODUCT_STATUS_LABELS[status] ?? status;
  }

  protected statusTone(status: Product['status']): string {
    return PRODUCT_STATUS_TONE[status] ?? 'badge';
  }

  protected categoryName(product: Product): string {
    return asProductCategory(product.category)?.name ?? '—';
  }

  protected brandName(product: Product): string {
    return asBrand(product.brand)?.name ?? '';
  }

  protected finalPrice(product: Product): number {
    return finalPrice(product);
  }

  protected allSelected(): boolean {
    return this.products().length > 0 && this.selected().size === this.products().length;
  }

  protected toggleAll(): void {
    if (this.allSelected()) this.selected.set(new Set());
    else this.selected.set(new Set(this.products().map((product) => product._id)));
  }

  protected toggleSelect(id: string): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected onSearch(): void {
    this.page.set(1);
    this.load();
  }

  protected setStatus(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.load();
  }

  protected setCategory(value: string): void {
    this.categoryFilter.set(value);
    this.page.set(1);
    this.load();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected goNew(): void {
    window.location.href = '/admin/shop/products/new';
  }

  protected bulk(action: 'publish' | 'draft' | 'delete'): void {
    const ids = [...this.selected()];
    if (ids.length === 0) return;
    this.shop.bulk(ids, action).subscribe({
      next: (result) => {
        this.toast.success(`${result.affected} محصول بهروزرسانی شد`);
        this.selected.set(new Set());
        this.load();
      },
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  protected confirmDelete(product: Product): void {
    this.deleteTarget.set(product);
    this.confirmOpen.set(true);
  }

  protected deleteMessage(): string {
    const product = this.deleteTarget();
    return product ? `محصول «${product.name}» برای همیشه حذف میشود.` : '';
  }

  protected performDelete(): void {
    const product = this.deleteTarget();
    if (!product) return;
    this.deleting.set(true);
    this.shop.remove(product._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmOpen.set(false);
        this.toast.success('محصول حذف شد');
        this.load();
      },
      error: (error: Error) => {
        this.deleting.set(false);
        this.toast.error(error.message);
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.shop
      .adminProducts({
        page: this.page(),
        limit: 20,
        q: this.searchTerm.trim() || undefined,
        status: this.statusFilter(),
        category: this.categoryFilter(),
      })
      .subscribe({
        next: (result) => {
          this.products.set(result.items ?? []);
          this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
          this.loading.set(false);
        },
        error: () => {
          this.products.set([]);
          this.loading.set(false);
        },
      });
  }
}
