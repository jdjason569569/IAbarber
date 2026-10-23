import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { parseIsoDate, toLocalIsoDate } from '../../../../shared/utils/date.util';

interface DayCell {
  day: number;
  iso: string;
  hasAppointments: boolean;
  selected: boolean;
  today: boolean;
}

/** Month calendar: days with appointments are painted green, the selected day has a ring. */
@Component({
  selector: 'app-appointment-calendar',
  templateUrl: 'appointment-calendar.component.html',
  styleUrls: ['appointment-calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class AppointmentCalendarComponent {
  private readonly i18n = inject(I18nService);

  /** ISO dates (`YYYY-MM-DD`) that have at least one appointment. */
  readonly markedDates = input.required<ReadonlySet<string>>();
  /** Selected ISO date. */
  readonly selectedDate = input.required<string>();
  readonly dateSelected = output<string>();

  /** First day of the month on display; follows the selected date until the user navigates. */
  private readonly shownMonth = linkedSignal(() => {
    const selected = parseIsoDate(this.selectedDate());
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });

  private readonly todayIso = toLocalIsoDate(new Date());

  /** Weekday initials starting on Monday (for example L M X J V S D). */
  protected readonly weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(this.i18n.locale, { weekday: 'narrow' }).format(
      new Date(2024, 0, 1 + index), // 2024-01-01 is a Monday
    ),
  );

  protected readonly monthTitle = computed(() => {
    const title = new Intl.DateTimeFormat(this.i18n.locale, {
      month: 'long',
      year: 'numeric',
    }).format(this.shownMonth());
    return title.charAt(0).toUpperCase() + title.slice(1);
  });

  /** Grid cells for the shown month; `null` pads the days before the 1st (weeks start on Monday). */
  protected readonly cells = computed<(DayCell | null)[]>(() => {
    const first = this.shownMonth();
    const year = first.getFullYear();
    const month = first.getMonth();
    const leading = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const marked = this.markedDates();
    const selected = this.selectedDate();

    const days = Array.from({ length: daysInMonth }, (_, index): DayCell => {
      const day = index + 1;
      const iso = toLocalIsoDate(new Date(year, month, day));
      return {
        day,
        iso,
        hasAppointments: marked.has(iso),
        selected: iso === selected,
        today: iso === this.todayIso,
      };
    });
    return [...Array<null>(leading).fill(null), ...days];
  });

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline });
  }

  protected previousMonth(): void {
    this.shownMonth.update((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  protected nextMonth(): void {
    this.shownMonth.update((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  protected select(cell: DayCell): void {
    this.dateSelected.emit(cell.iso);
  }

  protected dayLabel(cell: DayCell): string {
    return cell.hasAppointments
      ? `${cell.day}, ${this.i18n.t('appointments.calendar.hasAppointments')}`
      : String(cell.day);
  }
}
