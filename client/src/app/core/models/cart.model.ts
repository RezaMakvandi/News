import type { ProductCard } from './product.model';

export interface CartItem {
  id: string;
  product: string;
  name: string;
  slug: string;
  cover?: string;
  variant?: { name: string; value: string } | null;
  price: number;
  quantity: number;
  stock: number;
  total: number;
}

export interface Cart {
  items: CartItem[];
  itemsCount: number;
  subtotal: number;
  shippingCost: number;
}

export interface CartTotals {
  itemsTotal: number;
  discount: number;
  shippingCost: number;
  payable: number;
  freeShipping: boolean;
  couponCode: string;
}

export interface WishlistResponse extends Array<ProductCard> {}

/** Local (unauthenticated) cart line used before sign-in. */
export interface LocalCartItem {
  productId: string;
  quantity: number;
  variant?: { name: string; value: string } | null;
}
