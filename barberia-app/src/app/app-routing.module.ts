import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./core/layout/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'appointments',
        loadChildren: () =>
          import('./features/appointments/appointments.routes').then((m) => m.APPOINTMENTS_ROUTES),
      },
      {
        path: 'statistics',
        loadChildren: () =>
          import('./features/statistics/statistics.routes').then((m) => m.STATISTICS_ROUTES),
      },
      { path: '', redirectTo: 'appointments', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
