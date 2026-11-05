import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { calendarOutline, checkmark, personOutline, timeOutline } from 'ionicons/icons';
import { MessageKey } from '../../../../core/i18n/messages.es';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/** One line of the summary: an icon, its label and the saved value. */
export interface BookedSummaryRow {
  icon: string;
  label: MessageKey;
  value: string;
}

/** Card shown after the assistant saves an appointment, so the barber can check what was stored. */
@Component({
  selector: 'app-booked-summary',
  templateUrl: 'booked-summary.component.html',
  styleUrls: ['booked-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class BookedSummaryComponent {
  private readonly modalController = inject(ModalController);

  // Plain properties, not signal inputs: with @ionic/angular/lazy, ModalController hands
  // componentProps over with Object.assign, which would overwrite a signal input.
  title: MessageKey = 'assistant.booked.title';
  rows: BookedSummaryRow[] = [];
  /** Shown apart, large, at the bottom of the card. */
  price: string | null = null;

  constructor() {
    addIcons({ calendarOutline, checkmark, personOutline, timeOutline });
  }

  close(): void {
    void this.modalController.dismiss();
  }
}
