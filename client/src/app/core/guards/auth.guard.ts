import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/** Blocks anonymous visitors from admin routes and remembers the target URL. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (auth.isLoggedIn()) return true;

  toast.warning('برای دسترسی به این بخش باید وارد شوید.');
  return router.createUrlTree(['/admin/login'], { queryParams: { redirect: state.url } });
};

/** Allows only admin, editor and author roles into the admin panel. */
export const staffGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/admin/login']);
  }

  if (auth.isStaff()) return true;

  toast.error('شما به پنل مدیریت دسترسی ندارید.');
  return router.createUrlTree(['/']);
};

/** Allows only admin and editor roles (settings, users, categories, pages). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/admin/login']);
  }

  if (auth.isAdmin()) return true;

  toast.error('این بخش فقط برای مدیران و سردبیران قابل دسترسی است.');
  return router.createUrlTree(['/admin']);
};

/** Keeps signed-in staff away from the login page. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isStaff() ? router.createUrlTree(['/admin']) : true;
};