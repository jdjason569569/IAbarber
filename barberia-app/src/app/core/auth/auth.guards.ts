import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

/** The app screens need a session (admin); without one, go to the login page. */
export const sessionGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  return auth.role() ? true : router.parseUrl('/login');
};

/** The login page is skipped when there is already a session. */
export const noSessionGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  return auth.role() ? router.parseUrl('/') : true;
};
