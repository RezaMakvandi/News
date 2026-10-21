import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { SettingsService } from '../../../../core/services/settings.service';
import { CategoryService } from '../../../../core/services/taxonomy.service';
import { ShopService } from '../../../../core/services/shop.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { Category } from '../../../../core/models/taxonomy.model';
import type { ProductCategory } from '../../../../core/models/product.model';
import type { Page } from '../../../../core/models/settings.model';

interface MenuItem {
  id: string;
  label: string;
  type: 'newsCategory' | 'shopCategory' | 'page' | 'link';
  refId?: string;
  url: string;
  parent: string | null;
  order: number;
  mega: boolean;
}

@Component({
  selector: 'app-menus-page',
  imports: [FormsModule, IconComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    tbody tr {
      cursor: grab;
    }
    tbody tr.is-dragging {
      opacity: 0.5;
    }
  `,
  template: `
    <div class="admin-page-head">
      <div>
        <h1>منوها</h1>
        <p class="text-sm text-muted">
          مدیریت منوهای بالای سایت. از دسته‌بندی‌های اخبار، فروشگاه یا لینک دلخواه استفاده کنید و زیرمنو یا مگامنو بسازید.
        </p>
      </div>
      <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving()">
        @if (saving()) {
          <span class="spinner spinner-sm"></span>
        }
        ذخیره منوها
      </button>
    </div>

    @if (loading()) {
      <app-spinner label="در حال بارگذاری منوها…" />
    } @else {
      <div class="card card-pad" style="margin-bottom: var(--space-5)">
        <h3 class="card-title">افزودن آیتم منو</h3>
        <div class="grid-2" style="gap: var(--space-3)">
          <div class="field">
            <label class="label">نوع</label>
            <select class="input" [(ngModel)]="newType" name="newType">
              <option value="newsCategory">دسته‌بندی اخبار</option>
              <option value="shopCategory">دسته‌بندی فروشگاه</option>
              <option value="page">صفحه</option>
              <option value="link">لینک دلخواه</option>
            </select>
          </div>

          @if (newType === 'newsCategory') {
            <div class="field">
              <label class="label">دسته‌بندی</label>
              <select class="input" [(ngModel)]="newRefId" name="newRef">
                @for (cat of newsCategories(); track cat._id) {
                  <option [value]="cat._id">{{ cat.name }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label class="label">نام منو (دلخواه)</label>
              <input class="input" [(ngModel)]="newLabel" name="newLabel" placeholder="اگر خالی باشد، نام دسته‌بندی استفاده می‌شود" />
            </div>
          } @else if (newType === 'shopCategory') {
            <div class="field">
              <label class="label">دسته‌بندی</label>
              <select class="input" [(ngModel)]="newRefId" name="newRef">
                @for (cat of shopCategories(); track cat._id) {
                  <option [value]="cat._id">{{ cat.name }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label class="label">نام منو (دلخواه)</label>
              <input class="input" [(ngModel)]="newLabel" name="newLabel" placeholder="اگر خالی باشد، نام دسته‌بندی استفاده می‌شود" />
            </div>
          } @else if (newType === 'page') {
            <div class="field">
              <label class="label">صفحه</label>
              <select class="input" [(ngModel)]="newRefId" name="newRef">
                @for (page of pagesList(); track page._id) {
                  <option [value]="page._id">{{ page.title }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label class="label">نام منو (دلخواه)</label>
              <input class="input" [(ngModel)]="newLabel" name="newLabel" placeholder="اگر خالی باشد، عنوان صفحه استفاده می‌شود" />
            </div>
          } @else {
            <div class="field">
              <label class="label">برچسب</label>
              <input class="input" [(ngModel)]="newLabel" name="newLabel" placeholder="متن منو" />
            </div>
            <div class="field">
              <label class="label">آدرس</label>
              <input class="input" dir="ltr" [(ngModel)]="newUrl" name="newUrl" placeholder="/path" />
            </div>
          }

          <div class="field">
            <label class="label">والد (زیرمنو)</label>
            <select class="input" [(ngModel)]="newParent" name="newParent">
              <option [ngValue]="null">— منوی اصلی —</option>
              @for (item of items(); track item.id) {
                <option [value]="item.id">{{ item.label }}</option>
              }
            </select>
          </div>

          <div class="field">
            <label class="switch">
              <input type="checkbox" [(ngModel)]="newMega" name="newMega" />
              <span class="track"></span>
            </label>
            <span class="text-sm">مگامنو</span>
          </div>
        </div>

        <div style="margin-top: var(--space-3)">
          <button type="button" class="btn btn-soft" (click)="addItem()">
            <app-icon name="plus-circle" [size]="16" />
            افزودن به منو
          </button>
        </div>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>ترتیب</th>
                <th>برچسب</th>
                <th>نوع</th>
                <th>والد</th>
                <th>مگامنو</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (item of sortedItems(); track item.id; let i = $index) {
                <tr
                  draggable="true"
                  [class.is-dragging]="draggedId() === item.id"
                  (dragstart)="onDragStart(item, $event)"
                  (dragover)="onDragOver($event)"
                  (drop)="onDrop(item, $event)"
                  (dragend)="onDragEnd()"
                >
                  <td>
                    <app-icon name="menu" [size]="16" />
                  </td>
                  <td>
                    <input class="input" [(ngModel)]="item.label" [name]="'label-' + item.id" />
                  </td>
                  <td class="text-sm text-muted">
                    {{ typeLabel(item.type) }}
                  </td>
                  <td>
                    <select class="input" [(ngModel)]="item.parent" [name]="'parent-' + item.id">
                      <option [ngValue]="null">— اصلی —</option>
                      @for (candidate of items(); track candidate.id) {
                        @if (candidate.id !== item.id) {
                          <option [value]="candidate.id">{{ candidate.label }}</option>
                        }
                      }
                    </select>
                  </td>
                  <td>
                    <input type="checkbox" [(ngModel)]="item.mega" [name]="'mega-' + item.id" />
                  </td>
                  <td class="col-actions">
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon btn-sm is-danger"
                      (click)="remove(item.id)"
                    >
                      <app-icon name="trash" [size]="16" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export class MenusPage {
  private readonly settingsService = inject(SettingsService);
  private readonly categoryService = inject(CategoryService);
  private readonly shopService = inject(ShopService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly items = signal<MenuItem[]>([]);
  protected readonly draggedId = signal<string | null>(null);

  protected readonly newsCategories = signal<Category[]>([]);
  protected readonly shopCategories = signal<ProductCategory[]>([]);
  protected readonly pagesList = signal<Page[]>([]);

  protected newType: MenuItem['type'] = 'newsCategory';
  protected newRefId = '';
  protected newLabel = '';
  protected newUrl = '';
  protected newParent: string | null = null;
  protected newMega = false;

  constructor() {
    this.seo.set({ title: 'منوها | پنل مدیریت' });

    this.categoryService.list().subscribe({
      next: (cats) => this.newsCategories.set(cats ?? []),
      error: () => this.newsCategories.set([]),
    });
    this.shopService.categories().subscribe({
      next: (cats) => {
        const fixed: ProductCategory = {
          _id: 'shop-home',
          name: 'فروشگاه (صفحه اصلی)',
          slug: '',
          order: -1,
          isActive: true,
          showInMenu: true,
          parent: null,
        };
        this.shopCategories.set([fixed, ...(cats ?? [])]);
      },
      error: () => this.shopCategories.set([]),
    });

    this.settingsService.pages().subscribe({
      next: (pages) => this.pagesList.set((pages ?? []).filter((p) => p.isPublished !== false)),
      error: () => this.pagesList.set([]),
    });

    this.settingsService.load().subscribe({
      next: () => {
        const raw = this.settingsService.settings()['menuItems'];
        this.items.set(Array.isArray(raw) ? (raw as MenuItem[]) : []);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
      },
    });
  }

  protected sortedItems(): MenuItem[] {
    return [...this.items()].sort((a, b) => a.order - b.order);
  }

  protected typeLabel(type: MenuItem['type']): string {
    switch (type) {
      case 'newsCategory':
        return 'دسته‌بندی اخبار';
      case 'shopCategory':
        return 'دسته‌بندی فروشگاه';
      case 'page':
        return 'صفحه';
      default:
        return 'لینک';
    }
  }

  protected addItem(): void {
    let label = this.newLabel.trim();
    let url = this.newUrl.trim();
    let refId: string | undefined;

    if (this.newType === 'newsCategory') {
      const cat = this.newsCategories().find((c) => c._id === this.newRefId);
      if (!cat) {
        this.toast.error('دسته‌بندی را انتخاب کنید');
        return;
      }
      label = this.newLabel.trim() || cat.name;
      url = `/category/${cat.slug}`;
      refId = cat._id;
    } else if (this.newType === 'shopCategory') {
      if (!this.newRefId) this.newRefId = 'shop-home';
      const cat = this.shopCategories().find((c) => c._id === this.newRefId);
      if (!cat) {
        this.toast.error('دسته‌بندی را انتخاب کنید');
        return;
      }
      if (cat._id === 'shop-home') {
        label = this.newLabel.trim() || 'فروشگاه';
        url = '/shop';
        refId = 'shop-home';
      } else {
        label = this.newLabel.trim() || cat.name;
        url = `/shop/products?category=${cat.slug}`;
        refId = cat._id;
      }
    } else if (this.newType === 'page') {
      const page = this.pagesList().find((p) => p._id === this.newRefId);
      if (!page) {
        this.toast.error('صفحه را انتخاب کنید');
        return;
      }
      label = this.newLabel.trim() || page.title;
      url = `/page/${page.slug}`;
      refId = page._id;
    } else {
      if (!label || !url) {
        this.toast.error('برچسب و آدرس را وارد کنید');
        return;
      }
    }

    const item: MenuItem = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      label,
      type: this.newType,
      refId,
      url,
      parent: this.newParent,
      order: this.items().length,
      mega: this.newMega,
    };

    this.items.update((list) => [...list, item]);
    this.newLabel = '';
    this.newUrl = '';
    this.newMega = false;
    this.toast.success('آیتم به منو اضافه شد (برای ذخیره، ذخیره منوها را بزنید)');
  }

  protected remove(id: string): void {
    this.items.update((list) => list.filter((item) => item.id !== id));
  }

  protected move(item: MenuItem, direction: 1 | -1): void {
    const list = [...this.items()];
    const index = list.findIndex((x) => x.id === item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    list.forEach((entry, order) => (entry.order = order));
    this.items.set(list);
  }

  protected onDragStart(item: MenuItem, event: DragEvent): void {
    this.draggedId.set(item.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', item.id);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  protected onDrop(target: MenuItem, event: DragEvent): void {
    event.preventDefault();
    const fromId = this.draggedId();
    if (!fromId || fromId === target.id) return;

    const list = [...this.items()];
    const fromIndex = list.findIndex((item) => item.id === fromId);
    const toIndex = list.findIndex((item) => item.id === target.id);
    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    list.forEach((item, index) => (item.order = index));
    this.items.set(list);
    this.draggedId.set(null);
  }

  protected onDragEnd(): void {
    this.draggedId.set(null);
  }

  protected save(): void {
    this.saving.set(true);
    this.settingsService.adminSave([{ key: 'menuItems', value: this.items() }]).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('منوها ذخیره شد');
        this.settingsService.load(true).subscribe();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.error(error.message || 'ذخیره انجام نشد');
      },
    });
  }
}
