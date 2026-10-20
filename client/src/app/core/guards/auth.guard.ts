import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SettingsService } from '../services/settings.service';
import { ToastService } from '../services/toast.service';

/** Blocks anonymous visitors from admin routes and remembers the target URL. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (auth.isLoggedIn()) return true;

  toast.warning('برای دسترسی به این بخش باید وارد شوید.');
  return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

/** Allows only admin, editor and author roles into the admin panel. */
export const staffGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  if (auth.isStaff()) return true;

  // Ordinary (subscriber) accounts never enter the admin panel.
  toast.error('شما به پنل مدیریت دسترسی ندارید.');
  return router.createUrlTree(['/']);
};

/** Allows only admin and editor roles (settings, users, categories, pages). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  if (auth.isAdmin()) return true;

  toast.error('این بخش فقط برای مدیران و سردبیران قابل دسترسی است.');
  return router.createUrlTree(['/admin']);
};

/** Keeps signed-in users away from the login page. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return true;

  return auth.isStaff() ? router.createUrlTree(['/admin']) : router.createUrlTree(['/']);
};

/** Any signed-in user — ordinary customers included — reaches their own account pages. */
export const userGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (auth.isLoggedIn()) return true;

  toast.warning('برای دسترسی به این بخش باید وارد شوید.');
  return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

/**
 * Blocks the public storefront (`/shop/**`) while the shop is disabled in the
 * admin settings. Staff may still pass through to verify their changes.
 */
export const shopEnabledGuard: CanActivateFn = () => {
  const settings = inject(SettingsService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const auth = inject(AuthService);

  if (settings.shopEnabled() || auth.isStaff()) return true;

  toast.info('فروشگاه در حال حاضر غیرفعال است.');
  return router.createUrlTree(['/']);
};

/** Gates admin shop pages; admins keep access so they can re-enable the shop. */
export const adminShopEnabledGuard: CanActivateFn = () => {
  const settings = inject(SettingsService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const auth = inject(AuthService);

  if (settings.shopEnabled() || auth.isAdmin()) return true;

  toast.info('فروشگاه غیرفعال است. برای فعال‌سازی به تنظیمات بروید.');
  return router.createUrlTree(['/admin/settings']);
};