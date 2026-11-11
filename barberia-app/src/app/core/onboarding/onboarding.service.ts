import { Injectable } from '@angular/core';

const ONBOARDING_SEEN_KEY = 'barberia.onboardingSeen';

/**
 * Remembers whether the welcome tutorial was already shown on this device.
 * The flag lives in the WebView storage, so it is cleared when the app is uninstalled.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  isSeen(): boolean {
    try {
      return localStorage.getItem(ONBOARDING_SEEN_KEY) === '1';
    } catch {
      // Storage blocked: show the tutorial rather than break the app.
      return false;
    }
  }

  markSeen(): void {
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    } catch {
      // Nothing to do: the tutorial will show again next time.
    }
  }
}
