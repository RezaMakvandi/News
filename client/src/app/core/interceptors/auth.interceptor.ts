import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * Attaches the JWT to admin API calls, and on 401 clears the session so the
 * guards can send the user back to the login page. Errors are surfaced as
 * Persian toasts here so feature components only handle the happy path.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const token = auth.token();

  const authorized = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const message = extractMessage(error);

        if (error.status === 401) {
          auth.logout(false);
        } else if (error.status === 403) {
          toast.error(message || 'شما به این بخش دسترسی ندارید.');
        } else if (error.status >= 500) {
          toast.error('خطای سرور. لطفاً کمی بعد دوباره تلاش کنید.');
        }
      }

      return throwError(() => error);
    }),
  );
};

function extractMessage(error: HttpErrorResponse): string {
  const body = error.error as { message?: string } | null;
  return body?.message ?? '';
}