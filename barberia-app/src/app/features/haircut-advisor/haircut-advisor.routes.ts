import { Routes } from '@angular/router';

export const HAIRCUT_ADVISOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/haircut-advisor.page').then((m) => m.HaircutAdvisorPage),
  },
];
