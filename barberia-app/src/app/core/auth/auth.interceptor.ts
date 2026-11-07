import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** Adds the session headers to every API request; a 401 means the session ended, so back to login. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const auth = inject(AuthService);
  return from(auth.apiHeaders()).pipe(
    switchMap((headers) => next(req.clone({ setHeaders: headers }))),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Full reload so no data of the ended session stays cached in memory.
        void auth.signOut().then(() => window.location.replace('/login'));
      }
      return throwError(() => error);
    }),
  );
};
