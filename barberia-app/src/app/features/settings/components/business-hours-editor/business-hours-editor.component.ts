import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MessageKey } from '../../../../core/i18n/messages.es';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { DayHours } from '../../models/business-hours.model';
import { BusinessHoursService } from '../../services/business-hours.service';

/** Weekdays in the order the barber reads them: Monday first, Sunday last. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const HOURS = Array.from({ length: 25 }, (_, hour) => hour);

/** Lets the barber choose, per weekday, whether the shop opens and from what hour to what hour. */
@Component({
  selector: 'app-business-hours-editor',
  templateUrl: 'business-hours-editor.component.html',
  styleUrls: ['business-hours-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class BusinessHoursEditorComponent implements OnInit {
  private readonly businessHours = inject(BusinessHoursService);
  private readonly i18n = inject(I18nService);

  protected readonly days = signal<DayHours[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly message = signal<{ key: MessageKey; error: boolean } | null>(null);

  protected readonly orderedDays = computed(() =>
    WEEK_ORDER.map((weekday) => this.days().find((d) => d.weekday === weekday)).filter(
      (d): d is DayHours => d !== undefined,
    ),
  );

  protected readonly openingHours = HOURS.slice(0, 24);
  protected readonly closingHours = HOURS.slice(1);

  ngOnInit(): void {
    this.loading.set(true);
    this.businessHours.get().subscribe({
      next: (days) => {
        this.days.set(days);
        this.loading.set(false);
      },
      error: () => {
        this.message.set({ key: 'settings.hours.loadError', error: true });
        this.loading.set(false);
      },
    });
  }

  protected dayName(weekday: number): string {
    return this.i18n.t(`settings.hours.day${weekday}` as MessageKey);
  }

  /** `7` -> "07:00"; `24` -> the "midnight" label. */
  protected hourLabel(hour: number): string {
    return hour === 24 ? this.i18n.t('settings.hours.midnight') : `${String(hour).padStart(2, '0')}:00`;
  }

  protected setOpen(weekday: number, open: boolean): void {
    this.patch(weekday, { open });
  }

  protected setOpenHour(weekday: number, openHour: number): void {
    const day = this.days().find((d) => d.weekday === weekday);
    // Keep the range valid: closing moves one hour after the new opening when needed.
    const closeHour = day && day.closeHour <= openHour ? openHour + 1 : day?.closeHour;
    this.patch(weekday, { openHour, ...(closeHour !== undefined ? { closeHour } : {}) });
  }

  protected setCloseHour(weekday: number, closeHour: number): void {
    this.patch(weekday, { closeHour });
  }

  protected save(): void {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.message.set(null);
    this.businessHours.update(this.days()).subscribe({
      next: (days) => {
        this.days.set(days);
        this.dirty.set(false);
        this.saving.set(false);
        this.message.set({ key: 'settings.hours.saved', error: false });
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.message.set({
          key: err.status === 400 ? 'settings.hours.errors.invalid' : 'settings.errors.server',
          error: true,
        });
      },
    });
  }

  private patch(weekday: number, changes: Partial<DayHours>): void {
    this.days.update((days) => days.map((d) => (d.weekday === weekday ? { ...d, ...changes } : d)));
    this.dirty.set(true);
    this.message.set(null);
  }
}
