import { Routes } from '@angular/router';

export const STATISTICS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/statistics.page').then((m) => m.StatisticsPage),
  },
];
