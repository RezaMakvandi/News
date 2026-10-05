import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

/** Drives the global progress bar for any request not flagged as silent. */
export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  const loading = inject(LoadingService);

  if (request.headers.has('X-Silent')) {
    return next(request.clone({ headers: request.headers.delete('X-Silent') }));
  }

  loading.start();
  return next(request).pipe(finalize(() => loading.stop()));
};