import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { PushNotificationSchema } from '@capacitor/push-notifications';
import { ToastController } from '@ionic/angular/lazy';
import { Subject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { I18nService } from '../i18n/i18n.service';

/** Must match ANDROID_CHANNEL_ID in the API (FirebasePushSender). */
const BOOKINGS_CHANNEL_ID = 'bookings';

/**
 * Push notifications for the admin (barber): when a client books on WhatsApp the API sends a push
 * to this phone. Only on the native app; the browser and the guest demo never register.
 * - Admin session starts → asks permission, gets the FCM token and sends it to the API.
 * - Logout → the token is removed from the API before the session ends.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly toastController = inject(ToastController);
  private readonly url = `${environment.apiUrl}/notifications/devices`;

  /** Emits when a booking push arrives with the app open or is tapped; pages reload their data. */
  readonly bookingReceived$ = new Subject<void>();

  private token: string | null = null;
  private listening = false;

  constructor() {
    if (!Capacitor.isNativePlatform()) return;
    this.auth.onBeforeSignOut(() => this.unregister());
    effect(() => {
      if (this.auth.role() === 'admin') void this.register();
    });
  }

  private async register(): Promise<void> {
    try {
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive !== 'granted') return;
      await PushNotifications.createChannel({
        id: BOOKINGS_CHANNEL_ID,
        name: this.i18n.t('notifications.channelName'),
        description: this.i18n.t('notifications.channelDescription'),
        importance: 5,
        visibility: 1,
        vibration: true,
      });
      await this.listen();
      await PushNotifications.register();
    } catch (error) {
      console.error('Push registration failed', error);
    }
  }

  private async listen(): Promise<void> {
    if (this.listening) return;
    this.listening = true;
    await PushNotifications.addListener('registration', ({ value }) => {
      this.token = value;
      this.http.post(this.url, { token: value, platform: Capacitor.getPlatform() }).subscribe({
        error: (error: unknown) => console.error('Saving the push token failed', error),
      });
    });
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('FCM registration failed', error);
    });
    // With the app open Android shows nothing, so a toast tells the barber.
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      this.zone.run(() => void this.showToast(notification));
    });
    await PushNotifications.addListener('pushNotificationActionPerformed', () => {
      this.zone.run(() => {
        void this.router.navigateByUrl('/appointments');
        this.bookingReceived$.next();
      });
    });
  }

  private async unregister(): Promise<void> {
    const token = this.token;
    if (!token) return;
    this.token = null;
    try {
      await firstValueFrom(this.http.delete(this.url, { body: { token } }));
      await PushNotifications.unregister();
    } catch (error) {
      console.error('Removing the push token failed', error);
    }
  }

  private async showToast(notification: PushNotificationSchema): Promise<void> {
    this.bookingReceived$.next();
    const toast = await this.toastController.create({
      header: notification.title,
      message: notification.body,
      duration: 5000,
      position: 'top',
      color: 'primary',
    });
    await toast.present();
  }
}
