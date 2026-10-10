import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { ShopService } from '../../../../core/services/shop.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import type { Product } from '../../../../core/models/product.model';

@Component({
  selector: 'app-admin-inventory',
  imports: [
    FormsModule,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    FaNumberPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>مدیریت انبار و موجودی</h1>
        <p class="text-sm text-muted">بهروزرسانی سریع موجودی محصولات.</p>
      </div>
      <button type="button" class="btn btn-outline" (click)="load()">
        <app-icon name="refresh" [size]="16" /> بروزرسانی
      </button>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری..." />
    } @else if (!products().length) {
      <app-empty-state icon="package" title="محصولی یافت نشد" />
    } @else {
      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>محصول</th>
                <th>قیمت</th>
                <th style="width:200px">موجودی</th>
                <th>کد کالا</th>
                <th style="width:110px"></th>
              </tr>
            </thead>
            <tbody>
              @for (product of products(); track product._id) {
                <tr>
                  <td>
                    <div class="row" style="gap:var(--space-3)">
                      @if (product.cover) {
                        <img
                          [src]="product.cover"
                          [alt]="product.name"
                          style="width:40px;height:40px;object-fit:cover;border-radius:var(--radius-xs)"
                        />
                      }
                      <span style="font-weight:600">{{ product.name }}</span>
                    </div>
                  </td>
                  <td>{{ product.price | faNumber }}</td>
                  <td>
                    <div class="qty-control" style="justify-content:flex-start">
                      <button type="button" (click)="adjust(product, -1)">
                        <app-icon name="close" [size]="16" />
                      </button>
                      <input
                        class="input"
                        style="width:70px;text-align:center"
                        type="number"
                        [ngModel]="stockValue(product)"
                        (ngModelChange)="setDraft(product._id, $event)"
                        [name]="'stock' + product._id"
                      />
                      <button type="button" (click)="adjust(product, 1)">
                        <app-icon name="plus-circle" [size]="16" />
                      </button>
                    </div>
                  </td>
                  <td dir="ltr" class="text-sm text-muted">{{ product.sku || '—' }}</td>
                  <td>
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      [disabled]="savingId() === product._id"
                      (click)="saveStock(product)"
                    >
                      ذخیره
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="row" style="justify-content:center;margin-top:var(--space-4)">
        <app-pagination
          [page]="page()"
          [totalPages]="totalPages()"
          (pageChange)="goToPage($event)"
        />
      </div>
    }
  `,
})
export class AdminInventoryPage {
  private readonly shop = inject(ShopService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly savingId = signal('');
  protected readonly stockDraft = signal<Record<string, number>>({});

  constructor() {
    this.seo.set({ title: 'انبار | پنل مدیریت' });
    this.load();
  }

  protected setDraft(id: string, value: number): void {
    this.stockDraft.update((draft) => ({ ...draft, [id]: Number(value) || 0 }));
  }

  protected stockValue(product: Product): number {
    const draft = this.stockDraft();
    return Object.prototype.hasOwnProperty.call(draft, product._id)
      ? draft[product._id]
      : product.stock;
  }

  protected adjust(product: Product, delta: number): void {
    const current = this.stockValue(product);
    this.setDraft(product._id, Math.max(0, current + delta));
  }

  protected saveStock(product: Product): void {
    const stock = this.stockDraft()[product._id] ?? product.stock;
    this.savingId.set(product._id);
    this.shop.updateStock(product._id, stock).subscribe({
      next: (updated) => {
        this.savingId.set('');
        this.toast.success('موجودی بهروزرسانی شد');
        this.products.update((list) =>
          list.map((item) => (item._id === product._id ? { ...item, stock: updated.stock } : item)),
        );
      },
      error: (error: Error) => {
        this.savingId.set('');
        this.toast.error(error.message);
      },
    });
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.shop.adminProducts({ page: this.page(), limit: 20, sort: 'newest' }).subscribe({
      next: (result) => {
        this.products.set(result.items ?? []);
        this.totalPages.set(Math.max(1, result.meta?.totalPages ?? 1));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
