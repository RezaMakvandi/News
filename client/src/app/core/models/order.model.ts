import type { CartItem } from './cart.model';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'failed';

export type PaymentStatus = 'unpaid' | 'authorized' | 'paid' | 'failed' | 'refunded';

export interface OrderAddress {
  fullName: string;
  phone: string;
  province: string;
  city: string;
  postalCode?: string;
  address: string;
  notes?: string;
}

export interface OrderItem {
  product: string;
  name: string;
  slug: string;
  cover?: string;
  variant?: { name: string; value: string } | null;
  price: number;
  quantity: number;
  total: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user: string | { _id: string; name: string; email: string; phone?: string };
  items: OrderItem[];
  itemsTotal: number;
  discount: number;
  shippingCost: number;
  payable: number;
  couponCode: string;
  shippingMethod?: string;
  address: OrderAddress;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  payment: {
    gateway?: string;
    authority?: string;
    refId?: string;
    cardPan?: string;
    paidAt?: string;
  };
  trackingCode?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutPayload {
  address: OrderAddress;
  couponCode?: string;
  shippingMethod?: string;
}

export interface OrderQuery {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  q?: string;
  sort?: string;
}

export interface Coupon {
  _id: string;
  code: string;
  description?: string;
  type: 'percent' | 'fixed';
  amount: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  perUserLimit: number;
  isActive: boolean;
  startsAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CouponPayload {
  code: string;
  description?: string;
  type: 'percent' | 'fixed';
  amount: number;
  minOrder?: number;
  maxUses?: number;
  perUserLimit?: number;
  isActive?: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
}

export interface ShopStatsOverview {
  orders: { total: number; paid: number; pending: number; today: number };
  revenue: number;
  todayRevenue: number;
  customers: number;
  activeCoupons: number;
}

export interface ShopStatsCharts {
  series: { date: string; label: string; orders: number; revenue: number }[];
  topProducts: { _id: string; name: string; quantity: number; revenue: number }[];
  statusBreakdown: Record<string, number>;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت شده',
  processing: 'در حال پردازش',
  shipped: 'ارسال شده',
  delivered: 'تحویل داده شده',
  cancelled: 'لغو شده',
  refunded: 'مرجوع شده',
  failed: 'ناموفق',
};

export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  pending: 'badge badge-warning',
  paid: 'badge badge-success',
  processing: 'badge badge-info',
  shipped: 'badge badge-info',
  delivered: 'badge badge-success',
  cancelled: 'badge badge-danger',
  refunded: 'badge badge-danger',
  failed: 'badge badge-danger',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'پرداخت نشده',
  authorized: 'تأیید شده',
  paid: 'پرداخت شده',
  failed: 'ناموفق',
  refunded: 'برگشت داده شده',
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
];
