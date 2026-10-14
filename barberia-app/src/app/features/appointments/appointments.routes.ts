import { Routes } from '@angular/router';

export const APPOINTMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/appointment-list.page').then((m) => m.AppointmentListPage),
  },
];
