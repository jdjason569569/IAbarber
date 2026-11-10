import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { PushNotificationSchema } from '@capacitor/push-notifications';
import { AlertController } from '@ionic/angular/lazy';
import { Subject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { I18nService } from '../i18n/i18n.service';
import { parseIsoDate } from '../../shared/utils/date.util';

/** Must match ANDROID_CHANNEL_ID in the API (FirebasePushSender). */
const BOOKINGS_CHANNEL_ID = 'bookings';

/** Text right after the client name in a booking push (API) and in `notifications.bookingLine`. */
const CLIENT_NAME_END = ' agendó para ';

/** The fields of an appointment needed to describe a tapped push. */
interface BookedAppointment {
  client: string;
  date: string;
  time: string;
  cancelled: boolean;
}

/**
 * Push notifications for the admin (barber) and the guest demo: when a client books on WhatsApp the
 * API sends a push to the phones of both sessions. Only on the native app; the browser never registers.
 * - Session starts (admin or guest) → asks permission, gets the FCM token and sends it to the API
 *   (a token already stored moves to the workspace of the new session).
 * - Logout → the token is removed from the API before the session ends.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly alertController = inject(AlertController);
  private readonly url = `${environment.apiUrl}/notifications/devices`;
  private readonly appointmentsUrl = `${environment.apiUrl}/appointments`;

  /** Emits when a booking push arrives with the app open or is tapped; pages reload their data. */
  readonly bookingReceived$ = new Subject<void>();

  private token: string | null = null;
  private listening = false;
  /** Text → title of the bookings listed in the modal; cleared when the barber acknowledges them. */
  private readonly unseen = new Map<string, string>();
  /** The single open modal: new bookings are added to its list instead of stacking another on top. */
  private alert: Promise<HTMLIonAlertElement> | null = null;

  constructor() {
    if (!Capacitor.isNativePlatform()) return;
    this.auth.onBeforeSignOut(() => this.unregister());
    effect(() => {
      // Admin and guest both receive WhatsApp bookings (the guest gets a copy in its demo workspace).
      if (this.auth.role()) void this.register();
    });
    // Android hides the heads-up banner by itself; the push stays in the tray until seen, so every
    // time the barber comes back to the app the unseen bookings are shown in a modal that stays open.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.auth.role()) {
        this.zone.run(() => void this.collectDeliveredBookings());
      }
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
      await this.collectDeliveredBookings();
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
    // With the app open Android shows nothing, so a modal tells the barber and stays until seen.
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      this.zone.run(() => void this.addForegroundBooking(notification));
    });
    await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      this.zone.run(() => {
        void this.router.navigateByUrl('/appointments');
        this.bookingReceived$.next();
        void this.addTappedBooking(notification);
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

  /** Bookings pushed while the app was closed and still in the tray (not seen yet). */
  private async collectDeliveredBookings(): Promise<void> {
    try {
      const { notifications } = await PushNotifications.getDeliveredNotifications();
      const known = this.unseen.size;
      for (const notification of notifications) {
        // Android's auto-group summary has no text.
        const line = notification.body ?? notification.title;
        if (line) this.unseen.set(line, notification.title ?? '');
      }
      if (this.unseen.size > known) await this.showUnseenBookings();
    } catch (error) {
      console.error('Reading delivered notifications failed', error);
    }
  }

  /** Push received with the app open: Android shows nothing, so the modal is the notice. */
  private async addForegroundBooking(notification: PushNotificationSchema): Promise<void> {
    this.unseen.set(notification.body ?? '', notification.title ?? '');
    await this.showUnseenBookings();
  }

  /**
   * Android removes the tapped push from the tray and hands over only its data (date and time), so
   * the appointment is looked up. It joins the list when other bookings are unseen; alone, opening
   * the appointments is notice enough.
   */
  private async addTappedBooking(notification: PushNotificationSchema): Promise<void> {
    await this.collectDeliveredBookings();
    const date = notification.data?.date as string | undefined;
    const time = notification.data?.time as string | undefined;
    if (!date || !time || this.unseen.size === 0) return;
    try {
      const appointments = await firstValueFrom(this.http.get<BookedAppointment[]>(this.appointmentsUrl));
      const booking = appointments.find((a) => a.date === date && a.time === time && !a.cancelled);
      // The barber may have closed the modal while the appointments were loading.
      if (!booking || this.unseen.size === 0) return;
      const day = new Intl.DateTimeFormat(this.i18n.locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(parseIsoDate(date));
      this.unseen.set(this.i18n.t('notifications.bookingLine', { client: booking.client, date: day, time }), '');
      await this.showUnseenBookings();
    } catch (error) {
      console.error('Loading the tapped booking failed', error);
    }
  }

  /** Opens the modal, or refreshes the one already open, so it always lists every unseen booking. */
  private async showUnseenBookings(): Promise<void> {
    this.bookingReceived$.next();
    try {
      this.alert ??= this.openBookingAlert();
      const alert = await this.alert;
      const lines = [...this.unseen.keys()];
      alert.header = lines.length === 1 ? this.unseen.get(lines[0]) : this.i18n.t('notifications.unseenTitle');
      // Ionic renders `message` as plain text; the list is built here to have bold names.
      alert.querySelector('.alert-message')?.replaceChildren(...lines.map((line) => bookingItem(line, lines.length > 1)));
    } catch (error) {
      this.alert = null;
      console.error('Showing the booking modal failed', error);
    }
  }

  /** Stays open (no timeout, no backdrop dismiss) until the barber acknowledges it. */
  private async openBookingAlert(): Promise<HTMLIonAlertElement> {
    const alert = await this.alertController.create({
      cssClass: 'booking-alert',
      message: '',
      backdropDismiss: false,
      buttons: [
        { text: this.i18n.t('notifications.dismiss'), role: 'cancel' },
        {
          text: this.i18n.t('notifications.viewAppointments'),
          handler: () => {
            void this.router.navigateByUrl('/appointments');
          },
        },
      ],
    });
    void alert.onWillDismiss().then(async () => {
      this.alert = null;
      this.unseen.clear();
      await PushNotifications.removeAllDeliveredNotifications();
    });
    await alert.present();
    return alert;
  }
}

/** One booking of the modal, with the client name in bold. Text nodes: WhatsApp names are never HTML. */
function bookingItem(line: string, bullet: boolean): HTMLElement {
  const item = document.createElement('div');
  const nameEnd = line.indexOf(CLIENT_NAME_END);
  const name = document.createElement('strong');
  name.textContent = line.slice(0, Math.max(nameEnd, 0));
  item.append(bullet ? '• ' : '', name, line.slice(Math.max(nameEnd, 0)));
  return item;
}
