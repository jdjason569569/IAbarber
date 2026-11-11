import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { noSessionGuard, sessionGuard } from './core/auth/auth.guards';
import { onboardingDoneGuard, onboardingPendingGuard } from './core/onboarding/onboarding.guards';

const routes: Routes = [
  {
    path: 'onboarding',
    canActivate: [onboardingPendingGuard],
    loadChildren: () =>
      import('./features/onboarding/onboarding.routes').then((m) => m.ONBOARDING_ROUTES),
  },
  {
    path: 'login',
    canActivate: [onboardingDoneGuard, noSessionGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [onboardingDoneGuard, sessionGuard],
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
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      {
        path: 'haircut-advisor',
        loadChildren: () =>
          import('./features/haircut-advisor/haircut-advisor.routes').then(
            (m) => m.HAIRCUT_ADVISOR_ROUTES,
          ),
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
