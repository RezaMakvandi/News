import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { ShopService } from '../../../../core/services/shop.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import type {
  Brand,
  ProductCategory,
  ProductPayload,
  ProductSpec,
  ProductVariant,
} from '../../../../core/models/product.model';
import { finalPrice } from '../../../../core/utils/shop';

@Component({
  selector: 'app-product-editor',
  imports: [FormsModule, RouterLink, IconComponent, SpinnerComponent, FaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>{{ isEdit() ? 'ویرایش محصول' : 'محصول جدید' }}</h1>
        <p class="text-sm text-muted">
          <a routerLink="/admin/shop/products">محصولات</a> / {{ isEdit() ? 'ویرایش' : 'ایجاد' }}
        </p>
      </div>
      <div class="row" style="gap:var(--space-2)">
        <a class="btn btn-ghost" routerLink="/admin/shop/products">انصراف</a>
        <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="save()">
          @if (saving()) {
            <span class="spinner spinner-sm"></span>
          }
          <app-icon name="check" [size]="16" />
          ذخیره محصول
        </button>
      </div>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری..." />
    } @else {
      <div class="grid grid-2" style="align-items:start">
        <div class="stack" style="gap:var(--space-4)">
          <!-- Basic -->
          <div class="card">
            <div class="card-head"><span class="card-title">اطلاعات پایه</span></div>
            <div class="card-body">
              <div class="field">
                <label class="label">نام محصول <span class="req">*</span></label>
                <input class="input" [(ngModel)]="form.name" name="name" />
              </div>
              <div class="field">
                <label class="label">نامک (Slug)</label>
                <input
                  class="input"
                  dir="ltr"
                  [(ngModel)]="form.slug"
                  name="slug"
                  placeholder="خودکار از نام"
                />
              </div>
              <div class="field">
                <label class="label">خلاصه</label>
                <textarea
                  class="textarea"
                  rows="2"
                  [(ngModel)]="form.summary"
                  name="summary"
                ></textarea>
              </div>
              <div class="field">
                <label class="label">توضیحات کامل</label>
                <textarea
                  class="textarea"
                  rows="5"
                  [(ngModel)]="form.description"
                  name="description"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Pricing -->
          <div class="card">
            <div class="card-head"><span class="card-title">قیمت و موجودی</span></div>
            <div class="card-body">
              <div class="grid grid-2" style="gap:var(--space-4)">
                <div class="field">
                  <label class="label">قیمت (تومان) <span class="req">*</span></label>
                  <input class="input" type="number" [(ngModel)]="form.price" name="price" />
                </div>
                <div class="field">
                  <label class="label">قیمت با تخفیف (تومان)</label>
                  <input
                    class="input"
                    type="number"
                    [(ngModel)]="form.salePrice"
                    name="salePrice"
                  />
                </div>
                <div class="field">
                  <label class="label">درصد تخفیف</label>
                  <input
                    class="input"
                    type="number"
                    [(ngModel)]="form.discountPercent"
                    name="discount"
                  />
                </div>
                <div class="field">
                  <label class="label">موجودی</label>
                  <input class="input" type="number" [(ngModel)]="form.stock" name="stock" />
                </div>
                <div class="field">
                  <label class="label">کد کالا (SKU)</label>
                  <input class="input" dir="ltr" [(ngModel)]="form.sku" name="sku" />
                </div>
                <div class="field">
                  <label class="label">گارانتی</label>
                  <input
                    class="input"
                    [(ngModel)]="form.warranty"
                    name="warranty"
                    placeholder="۲۴ ماه گارانتی"
                  />
                </div>
              </div>
              <div class="text-sm text-muted" style="margin-top:var(--space-2)">
                قیمت نهایی:
                <strong style="color:var(--accent)"
                  >{{ finalPriceValue() | faNumber }} تومان</strong
                >
              </div>
            </div>
          </div>

          <!-- Specs -->
          <div class="card">
            <div class="card-head">
              <span class="card-title">مشخصات فنی</span>
              <button type="button" class="btn btn-sm btn-soft" (click)="addSpec()">
                <app-icon name="plus-circle" [size]="14" /> افزودن
              </button>
            </div>
            <div class="card-body">
              @if (form.specs.length) {
                @for (spec of form.specs; track $index) {
                  <div class="row" style="gap:var(--space-2);margin-bottom:var(--space-2)">
                    <input
                      class="input"
                      style="flex:1"
                      placeholder="عنوان"
                      [(ngModel)]="spec.name"
                      [name]="'sn' + $index"
                    />
                    <input
                      class="input"
                      style="flex:1.4"
                      placeholder="مقدار"
                      [(ngModel)]="spec.value"
                      [name]="'sv' + $index"
                    />
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon"
                      (click)="removeSpec($index)"
                      aria-label="حذف"
                    >
                      <app-icon name="trash" [size]="15" />
                    </button>
                  </div>
                }
              } @else {
                <p class="text-sm text-muted">مشخصات فنی ثبت نشده است.</p>
              }
            </div>
          </div>

          <!-- Variants -->
          <div class="card">
            <div class="card-head">
              <span class="card-title">واریانتها (رنگ، حافظه...)</span>
              <button type="button" class="btn btn-sm btn-soft" (click)="addVariant()">
                <app-icon name="plus-circle" [size]="14" /> افزودن
              </button>
            </div>
            <div class="card-body">
              @if (form.variants.length) {
                @for (variant of form.variants; track $index) {
                  <div
                    class="row"
                    style="gap:var(--space-2);margin-bottom:var(--space-2);flex-wrap:wrap"
                  >
                    <input
                      class="input"
                      style="flex:1;min-width:90px"
                      placeholder="نام (رنگ)"
                      [(ngModel)]="variant.name"
                      [name]="'vn' + $index"
                    />
                    <input
                      class="input"
                      style="flex:1.3;min-width:100px"
                      placeholder="مقدار (مشکی)"
                      [(ngModel)]="variant.value"
                      [name]="'vv' + $index"
                    />
                    <input
                      class="input"
                      style="width:110px"
                      type="number"
                      placeholder="اختلاف قیمت"
                      [(ngModel)]="variant.priceDelta"
                      [name]="'vp' + $index"
                    />
                    <input
                      class="input"
                      style="width:90px"
                      type="number"
                      placeholder="موجودی"
                      [(ngModel)]="variant.stock"
                      [name]="'vs' + $index"
                    />
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon"
                      (click)="removeVariant($index)"
                      aria-label="حذف"
                    >
                      <app-icon name="trash" [size]="15" />
                    </button>
                  </div>
                }
              } @else {
                <p class="text-sm text-muted">واریانتی تعریف نشده است.</p>
              }
            </div>
          </div>
        </div>

        <div class="stack" style="gap:var(--space-4)">
          <!-- Organisation -->
          <div class="card">
            <div class="card-head"><span class="card-title">سازماندهی</span></div>
            <div class="card-body">
              <div class="field">
                <label class="label">دستهبندی <span class="req">*</span></label>
                <select class="select" [(ngModel)]="form.category" name="category">
                  <option value="">انتخاب کنید</option>
                  @for (category of categories(); track category._id) {
                    <option [value]="category._id">{{ category.name }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label class="label">برند</label>
                <select class="select" [(ngModel)]="form.brand" name="brand">
                  <option [ngValue]="null">بدون برند</option>
                  @for (brand of brands(); track brand._id) {
                    <option [value]="brand._id">{{ brand.name }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label class="label">وضعیت</label>
                <select class="select" [(ngModel)]="form.status" name="status">
                  <option value="draft">پیشنویس</option>
                  <option value="published">منتشر شده</option>
                  <option value="archived">بایگانی</option>
                </select>
              </div>
              <label class="switch" style="margin-bottom:var(--space-3)">
                <input type="checkbox" [(ngModel)]="form.isFeatured" name="isFeatured" />
                <span class="track"></span>
                نمایش بهعنوان پیشنهاد ویژه
              </label>
              <label class="switch">
                <input type="checkbox" [(ngModel)]="form.isNewArrival" name="isNewArrival" />
                <span class="track"></span>
                برچسب «جدید»
              </label>
            </div>
          </div>

          <!-- Images -->
          <div class="card">
            <div class="card-head">
              <span class="card-title">تصاویر</span>
              <button type="button" class="btn btn-sm btn-soft" (click)="addImage()">
                <app-icon name="plus-circle" [size]="14" /> تصویر
              </button>
            </div>
            <div class="card-body">
              @if (form.cover) {
                <img
                  [src]="form.cover"
                  alt="cover"
                  style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:var(--radius);margin-bottom:var(--space-3)"
                />
              }
              @for (image of form.images; track $index) {
                <div class="row" style="gap:var(--space-2);margin-bottom:var(--space-2)">
                  <input
                    class="input"
                    dir="ltr"
                    placeholder="https://..."
                    [(ngModel)]="image.url"
                    [name]="'img' + $index"
                    (change)="$index === 0 && setCover(image.url)"
                  />
                  <button
                    type="button"
                    class="btn btn-ghost btn-icon"
                    (click)="removeImage($index)"
                    aria-label="حذف"
                  >
                    <app-icon name="trash" [size]="15" />
                  </button>
                </div>
              }
              @if (!form.images.length) {
                <p class="text-sm text-muted">تصویری اضافه نشده است.</p>
              }
              <div class="field" style="margin-top:var(--space-3)">
                <label class="label">آدرس تصویر اصلی</label>
                <input class="input" dir="ltr" [(ngModel)]="form.cover" name="cover" />
              </div>
            </div>
          </div>

          <!-- SEO -->
          <div class="card">
            <div class="card-head"><span class="card-title">سئو</span></div>
            <div class="card-body">
              <div class="field">
                <label class="label">عنوان سئو</label>
                <input class="input" [(ngModel)]="form.seo.title" name="seoTitle" />
              </div>
              <div class="field">
                <label class="label">توضیح سئو</label>
                <textarea
                  class="textarea"
                  rows="2"
                  [(ngModel)]="form.seo.description"
                  name="seoDescription"
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .grid-2 {
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    }

    @media (max-width: 1080px) {
      .grid-2 {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ProductEditorPage {
  /** Bound from the `admin/shop/products/:id/edit` route. */
  readonly id = input('');

  private readonly shop = inject(ShopService);
  private readonly seoService = inject(SeoService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly isEdit = computed(() => Boolean(this.id()));
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly categories = signal<ProductCategory[]>([]);
  protected readonly brands = signal<Brand[]>([]);

  protected form: ProductForm = emptyForm();

  constructor() {
    this.seoService.set({ title: 'ویرایش محصول | پنل مدیریت' });

    this.shop
      .categories(true)
      .subscribe({ next: (list) => this.categories.set(list ?? []), error: () => undefined });
    this.shop
      .brands(true)
      .subscribe({ next: (list) => this.brands.set(list ?? []), error: () => undefined });

    effect(() => {
      const id = this.id();
      if (!id) return;
      this.loading.set(true);
      this.shop.adminGet(id).subscribe({
        next: (product) => {
          this.form = toForm(product);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('محصول یافت نشد');
          void this.router.navigate(['/admin/shop/products']);
        },
      });
    });
  }

  protected readonly finalPriceValue = computed(() => {
    const price = this.form.price || 0;
    const salePrice = this.form.salePrice || 0;
    const discount = this.form.discountPercent || 0;
    if (salePrice > 0 && salePrice < price) return salePrice;
    if (discount > 0) return Math.round(price * (1 - discount / 100));
    return price;
  });

  protected addSpec(): void {
    this.form.specs.push({ group: 'عمومی', name: '', value: '' });
  }

  protected removeSpec(index: number): void {
    this.form.specs.splice(index, 1);
  }

  protected addVariant(): void {
    this.form.variants.push({ name: '', value: '', priceDelta: 0, stock: 0 });
  }

  protected removeVariant(index: number): void {
    this.form.variants.splice(index, 1);
  }

  protected addImage(): void {
    this.form.images.push({ url: '', alt: this.form.name });
  }

  protected removeImage(index: number): void {
    this.form.images.splice(index, 1);
  }

  protected setCover(url: string): void {
    this.form.cover = url;
  }

  protected save(): void {
    if (!this.form.name.trim()) {
      this.toast.warning('نام محصول الزامی است');
      return;
    }
    if (!this.form.category) {
      this.toast.warning('دستهبندی را انتخاب کنید');
      return;
    }
    if (!this.form.price || this.form.price <= 0) {
      this.toast.warning('قیمت محصول را وارد کنید');
      return;
    }

    this.saving.set(true);
    const payload = cleanPayload(this.form);

    const request = this.isEdit()
      ? this.shop.update(this.id(), payload)
      : this.shop.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.isEdit() ? 'محصول بهروزرسانی شد' : 'محصول ایجاد شد');
        void this.router.navigate(['/admin/shop/products']);
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.error(error.message);
      },
    });
  }
}

function emptyForm(): {
  name: string;
  slug: string;
  summary: string;
  description: string;
  brand: string | null;
  category: string;
  images: { url: string; alt?: string }[];
  cover: string;
  price: number;
  salePrice: number;
  discountPercent: number;
  stock: number;
  sku: string;
  variants: ProductVariant[];
  specs: ProductSpec[];
  status: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  warranty: string;
  shippingNote: string;
  seo: { title: string; description: string };
} {
  return {
    name: '',
    slug: '',
    summary: '',
    description: '',
    brand: null,
    category: '',
    images: [],
    cover: '',
    price: 0,
    salePrice: 0,
    discountPercent: 0,
    stock: 0,
    sku: '',
    variants: [],
    specs: [],
    status: 'draft',
    isFeatured: false,
    isNewArrival: false,
    warranty: '',
    shippingNote: '',
    seo: { title: '', description: '' },
  };
}

type ProductForm = ReturnType<typeof emptyForm>;

type ProductWithRefs = {
  _id?: string;
  name: string;
  slug?: string;
  summary?: string;
  description?: string;
  brand?: { _id: string } | string | null;
  category?: { _id: string } | string;
  images?: { url: string; alt?: string }[];
  cover?: string;
  price: number;
  salePrice?: number;
  discountPercent?: number;
  stock?: number;
  sku?: string;
  variants?: ProductVariant[];
  specs?: ProductSpec[];
  status?: string;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  warranty?: string;
  shippingNote?: string;
  seo?: { title?: string; description?: string };
};

function idOf(value: { _id: string } | string | null | undefined): string {
  if (!value) return '';
  return typeof value === 'string' ? value : value._id;
}

function toForm(product: ProductWithRefs): ProductForm {
  return {
    name: product.name,
    slug: product.slug ?? '',
    summary: product.summary ?? '',
    description: product.description ?? '',
    brand: idOf(product.brand) || null,
    category: idOf(product.category),
    images: product.images ?? [],
    cover: product.cover ?? '',
    price: product.price,
    salePrice: product.salePrice ?? 0,
    discountPercent: product.discountPercent ?? 0,
    stock: product.stock ?? 0,
    sku: product.sku ?? '',
    variants: product.variants ?? [],
    specs: product.specs ?? [],
    status: (product.status as ProductForm['status']) ?? 'draft',
    isFeatured: Boolean(product.isFeatured),
    isNewArrival: Boolean(product.isNewArrival),
    warranty: product.warranty ?? '',
    shippingNote: product.shippingNote ?? '',
    seo: { title: product.seo?.title ?? '', description: product.seo?.description ?? '' },
  };
}

function cleanPayload(form: ProductForm): ProductPayload {
  return {
    ...form,
    status: form.status as ProductPayload['status'],
    slug: form.slug || undefined,
    brand: form.brand || null,
    images: form.images.filter((image) => image.url.trim()),
    variants: form.variants.filter((variant) => variant.name.trim() && variant.value.trim()),
    specs: form.specs.filter((spec) => spec.name.trim() && spec.value.trim()),
  };
}
