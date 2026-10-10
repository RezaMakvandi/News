import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { StarsComponent } from '../../../../shared/components/stars/stars';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { ShopService } from '../../../../core/services/shop.service';
import { CartService } from '../../../../core/services/cart.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import type { ProductCard } from '../../../../core/models/product.model';
import { asBrand, discountPercent, finalPrice } from '../../../../core/utils/shop';
@Component({
  selector: 'app-compare',
  imports: [RouterLink, IconComponent, StarsComponent, SpinnerComponent, FaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <div class="admin-page-head" style="margin-bottom:var(--space-5)">
        <div>
          <h1><app-icon name="git-compare" [size]="22" /> مقایسه محصولات</h1>
          <p class="text-sm text-muted">حداکثر ۴ محصول را کنار هم مقایسه کنید.</p>
        </div>
        @if (products().length) {
          <button type="button" class="btn btn-ghost" (click)="clear()">
            <app-icon name="trash" [size]="16" /> پاک کردن
          </button>
        }
      </div>

      @if (loading()) {
        <app-spinner label="در حال بارگذاری..." />
      } @else if (products().length) {
        <div style="overflow-x:auto">
          <table class="compare-table">
            <tbody>
              <tr>
                <th>محصول</th>
                @for (product of products(); track product._id) {
                  <td style="text-align:center">
                    <a [routerLink]="['/shop/product', product.slug]">
                      @if (product.cover) {
                        <img [src]="product.cover" [alt]="product.name" />
                      }
                    </a>
                    <a
                      [routerLink]="['/shop/product', product.slug]"
                      style="display:block;font-weight:700;margin-top:8px"
                    >
                      {{ product.name }}
                    </a>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      style="margin-top:6px"
                      (click)="remove(product._id)"
                    >
                      <app-icon name="close" [size]="14" /> حذف
                    </button>
                  </td>
                }
              </tr>
              <tr>
                <th>قیمت</th>
                @for (product of products(); track product._id) {
                  <td style="text-align:center">
                    @if (discountPercent(product) > 0) {
                      <div class="text-xs text-muted" style="text-decoration:line-through">
                        {{ product.price | faNumber }} تومان
                      </div>
                    }
                    <strong style="color:var(--accent)"
                      >{{ finalPrice(product) | faNumber }} تومان</strong
                    >
                  </td>
                }
              </tr>
              <tr>
                <th>امتیاز</th>
                @for (product of products(); track product._id) {
                  <td style="text-align:center">
                    <app-stars [value]="product.rating || 0" [showValue]="true" />
                  </td>
                }
              </tr>
              <tr>
                <th>برند</th>
                @for (product of products(); track product._id) {
                  <td style="text-align:center">{{ brandOf(product) }}</td>
                }
              </tr>
              <tr>
                <th>موجودی</th>
                @for (product of products(); track product._id) {
                  <td style="text-align:center">
                    @if (product.stock > 0) {
                      <span class="badge badge-success">موجود</span>
                    } @else {
                      <span class="badge badge-danger">ناموجود</span>
                    }
                  </td>
                }
              </tr>
              <tr>
                <th>مشخصات</th>
                @for (product of products(); track product._id) {
                  <td>
                    @if (specsOf(product).length) {
                      <ul style="display:flex;flex-direction:column;gap:4px;font-size:0.8rem">
                        @for (spec of specsOf(product); track $index) {
                          <li>{{ spec.name }}: {{ spec.value }}</li>
                        }
                      </ul>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                }
              </tr>
            </tbody>
          </table>
        </div>
      } @else {
        <div class="shop-empty">
          <div class="shop-empty-icon"><app-icon name="git-compare" [size]="40" /></div>
          <h2>محصولی برای مقایسه انتخاب نشده است</h2>
          <p class="text-muted">از کارت محصولات، آیکون مقایسه را انتخاب کنید.</p>
          <a class="btn btn-primary" routerLink="/shop/products">مشاهده محصولات</a>
        </div>
      }
    </div>
  `,
})
export class ComparePage {
  private readonly shop = inject(ShopService);
  private readonly cart = inject(CartService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  protected readonly products = signal<ProductCard[]>([]);
  protected readonly loading = signal(true);

  protected readonly discountPercent = discountPercent;
  protected readonly finalPrice = finalPrice;

  constructor() {
    this.seo.set({ title: 'مقایسه محصولات' });

    const ids = this.cart.compareIds();
    if (ids.length === 0) {
      this.loading.set(false);
      return;
    }

    this.shop.compare(ids).subscribe({
      next: (products) => {
        this.products.set(products ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected brandOf(product: ProductCard): string {
    return asBrand(product.brand)?.name ?? '—';
  }

  protected specsOf(product: ProductCard): { name: string; value: string }[] {
    return (product as unknown as { specs?: { name: string; value: string }[] }).specs ?? [];
  }

  protected remove(id: string): void {
    this.cart.toggleCompare(id);
    this.products.update((list) => list.filter((item) => item._id !== id));
  }

  protected clear(): void {
    this.cart.clearCompare();
    this.products.set([]);
    this.toast.info('لیست مقایسه پاک شد');
  }
}
