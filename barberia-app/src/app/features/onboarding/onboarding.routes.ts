import { Routes } from '@angular/router';

export const ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/onboarding.page').then((m) => m.OnboardingPage),
  },
];
