import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Share } from '@capacitor/share';
import { IonicModule, ToastController } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { copyOutline, shareSocialOutline } from 'ionicons/icons';
import { environment } from '../../../../../environments/environment';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/** Public booking page of the API: clients book with a name and a phone, no email. */
const BOOKING_PATH = '/reservar';

/** "Enlace de reservas": the link the barber shares so clients book themselves. */
@Component({
  selector: 'app-booking-link-card',
  templateUrl: 'booking-link-card.component.html',
  styleUrl: 'booking-link-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class BookingLinkCardComponent {
  private readonly i18n = inject(I18nService);
  private readonly toasts = inject(ToastController);

  protected readonly link = `${environment.apiUrl}${BOOKING_PATH}`;

  constructor() {
    addIcons({ copyOutline, shareSocialOutline });
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link);
      await this.toast('settings.bookingLink.copied');
    } catch {
      await this.toast('settings.bookingLink.copyError');
    }
  }

  /** Android's share sheet (WhatsApp, Instagram...); copies the link where sharing is not available. */
  protected async share(): Promise<void> {
    const { value: canShare } = await Share.canShare().catch(() => ({ value: false }));
    if (!canShare) {
      await this.copy();
      return;
    }
    try {
      await Share.share({
        title: this.i18n.t('settings.bookingLink.shareTitle'),
        text: this.i18n.t('settings.bookingLink.shareText'),
        url: this.link,
        dialogTitle: this.i18n.t('settings.bookingLink.share'),
      });
    } catch {
      // The barber closed the share sheet: nothing to do.
    }
  }

  private async toast(key: 'settings.bookingLink.copied' | 'settings.bookingLink.copyError'): Promise<void> {
    const toast = await this.toasts.create({ message: this.i18n.t(key), duration: 2000, position: 'bottom' });
    await toast.present();
  }
}
