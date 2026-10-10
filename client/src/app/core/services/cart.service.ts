import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import type { Cart, CartTotals, WishlistResponse } from '../models/cart.model';
import type { ProductCard } from '../models/product.model';

const LOCAL_CART_KEY = 'zoomit-shop-cart';
const COMPARE_KEY = 'zoomit-shop-compare';

interface LocalCartLine {
  productId: string;
  quantity: number;
  variant?: { name: string; value: string } | null;
}

/**
 * Server-backed cart for signed-in users. The full cart object is cached in a
 * signal so the header badge and pages stay in sync without re-fetching.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private readonly cartSignal = signal<Cart>({
    items: [],
    itemsCount: 0,
    subtotal: 0,
    shippingCost: 0,
  });

  readonly cart = this.cartSignal.asReadonly();
  readonly itemsCount = computed(() => this.cartSignal().itemsCount);

  /** GET /api/shop/cart — refreshes the cached cart. */
  load(): Observable<Cart> {
    return this.api
      .get<Cart>('shop/cart')
      .pipe(tap((cart) => this.cartSignal.set(cart ?? emptyCart())));
  }

  /** POST /api/shop/cart/items */
  add(
    productId: string,
    quantity = 1,
    variant?: { name: string; value: string } | null,
  ): Observable<Cart> {
    return this.api.post<Cart>('shop/cart/items', { productId, quantity, variant }).pipe(
      tap((cart) => this.cartSignal.set(cart ?? emptyCart())),
      tap(() => this.toast.success('کالا به سبد خرید اضافه شد')),
    );
  }

  /** PUT /api/shop/cart/items/:id */
  updateQuantity(itemId: string, quantity: number): Observable<Cart> {
    return this.api
      .put<Cart>(`shop/cart/items/${itemId}`, { quantity })
      .pipe(tap((cart) => this.cartSignal.set(cart ?? emptyCart())));
  }

  /** DELETE /api/shop/cart/items/:id */
  removeItem(itemId: string): Observable<Cart> {
    return this.api.delete<Cart>(`shop/cart/items/${itemId}`).pipe(
      tap((cart) => this.cartSignal.set(cart ?? emptyCart())),
      tap(() => this.toast.info('کالا از سبد خرید حذف شد')),
    );
  }

  /** DELETE /api/shop/cart */
  clear(): Observable<Cart> {
    return this.api
      .delete<Cart>('shop/cart')
      .pipe(tap((cart) => this.cartSignal.set(cart ?? emptyCart())));
  }

  /** POST /api/shop/cart/validate-coupon */
  validateCoupon(code: string): Observable<CartTotals> {
    return this.api.post<CartTotals>('shop/cart/validate-coupon', { code });
  }

  /* ------------------------------ Wishlist ------------------------------- */

  /** GET /api/shop/wishlist */
  wishlist(): Observable<ProductCard[]> {
    return this.api.get<ProductCard[]>('shop/wishlist');
  }

  /** POST /api/shop/wishlist/:productId — toggles. */
  toggleWishlist(productId: string): Observable<{ wishlisted: boolean }> {
    return this.api.post<{ wishlisted: boolean }>(`shop/wishlist/${productId}`);
  }

  /* ------------------------------- Compare ------------------------------- */

  /** Local comparison list, persisted in localStorage (max 4). */
  private readonly compareSignal = signal<string[]>(readCompare());
  readonly compareIds = this.compareSignal.asReadonly();
  readonly compareCount = computed(() => this.compareSignal().length);

  toggleCompare(productId: string): void {
    const current = this.compareSignal();
    if (current.includes(productId)) {
      this.setCompare(current.filter((id) => id !== productId));
      return;
    }
    if (current.length >= 4) {
      this.toast.warning('حداکثر ۴ محصول قابل مقایسه است');
      return;
    }
    this.setCompare([...current, productId]);
  }

  clearCompare(): void {
    this.setCompare([]);
  }

  private setCompare(ids: string[]): void {
    this.compareSignal.set(ids);
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }

  /* --------------------- Local cart (pre-sign-in) ------------------------ */

  private readLocal(): LocalCartLine[] {
    try {
      const raw = localStorage.getItem(LOCAL_CART_KEY);
      return raw ? (JSON.parse(raw) as LocalCartLine[]) : [];
    } catch {
      return [];
    }
  }

  private writeLocal(lines: LocalCartLine[]): void {
    try {
      localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }

  saveLocal(
    productId: string,
    quantity = 1,
    variant?: { name: string; value: string } | null,
  ): void {
    const lines = this.readLocal();
    const existing = lines.find(
      (line) =>
        line.productId === productId && (line.variant?.value ?? '') === (variant?.value ?? ''),
    );
    if (existing) existing.quantity += quantity;
    else lines.push({ productId, quantity, variant });
    this.writeLocal(lines);
  }

  /** Pushes any locally saved lines to the server (called after login). */
  mergeLocalIntoServer(): void {
    const lines = this.readLocal();
    if (lines.length === 0 || !this.auth.isLoggedIn()) return;

    lines.forEach((line) => {
      this.add(line.productId, line.quantity, line.variant ?? null).subscribe({
        error: () => undefined,
      });
    });
    this.writeLocal([]);
  }

  /** Total quantity saved locally, used for the header badge when logged out. */
  localCount(): number {
    return this.readLocal().reduce((sum, line) => sum + line.quantity, 0);
  }

  reset(): void {
    this.cartSignal.set(emptyCart());
  }
}

const emptyCart = (): Cart => ({ items: [], itemsCount: 0, subtotal: 0, shippingCost: 0 });

function readCompare(): string[] {
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
