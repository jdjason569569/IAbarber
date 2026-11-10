import { Injectable, inject } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AuthService } from '../auth/auth.service';

/**
 * Android hardware back button. Without a listener Capacitor goes back in the WebView history,
 * which takes the admin out of the app screens. With this listener:
 * - Ionic still handles it (closes modals, alerts, menus and pops pages inside an outlet).
 * - Admin session: it never leaves the app screens; the session only ends with "Cerrar sesión".
 * - No session (login screen): keeps the previous behaviour (WebView history back).
 */
@Injectable({ providedIn: 'root' })
export class HardwareBackButtonService {
  private readonly auth = inject(AuthService);

  constructor() {
    if (!Capacitor.isNativePlatform()) return;
    void App.addListener('backButton', ({ canGoBack }) => {
      if (this.auth.role() === 'admin') return;
      if (canGoBack) window.history.back();
    });
  }
}
