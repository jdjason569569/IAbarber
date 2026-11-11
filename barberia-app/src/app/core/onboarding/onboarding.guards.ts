import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { OnboardingService } from './onboarding.service';

/** The first time the app opens, show the welcome tutorial before anything else. */
export const onboardingDoneGuard: CanActivateFn = () =>
  inject(OnboardingService).isSeen() ? true : inject(Router).parseUrl('/onboarding');

/** Once the tutorial was seen, it is not shown again. */
export const onboardingPendingGuard: CanActivateFn = () =>
  inject(OnboardingService).isSeen() ? inject(Router).parseUrl('/') : true;
