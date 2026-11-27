import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { micOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { formatTime12 } from '../../../../shared/utils/time.util';
import { DayHours } from '../../models/business-hours.model';
import { BusinessHoursService } from '../../services/business-hours.service';
import { VoicePromptService } from '../../services/voice-prompt.service';
import { WEEK_ORDER, parseWeeklyHours } from '../../utils/weekly-hours-phrase';
import { VoicePromptModalComponent } from '../voice-prompt-modal/voice-prompt-modal.component';

/** Times the assistant asks when it cannot read the schedule. */
const MAX_ATTEMPTS = 2;

/** January 4, 2026 was a Sunday: adding the weekday number gives a date of that weekday. */
const A_SUNDAY = new Date(2026, 0, 4);

interface DayRow {
  weekday: number;
  day: string;
  open: boolean;
  hours: string;
}

/**
 * Opening hours of the week: shows each day and lets the barber change them by telling the
 * assistant (voice or typed) which days and at what hours they work. Saved at once.
 */
@Component({
  selector: 'app-weekly-hours-editor',
  templateUrl: 'weekly-hours-editor.component.html',
  styleUrls: ['weekly-hours-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe, VoicePromptModalComponent],
  providers: [VoicePromptService],
})
export class WeeklyHoursEditorComponent implements OnInit {
  private readonly businessHours = inject(BusinessHoursService);
  protected readonly assistant = inject(VoicePromptService);
  private readonly i18n = inject(I18nService);

  private readonly dayNames = new Intl.DateTimeFormat(this.i18n.locale, { weekday: 'long' });
  private readonly listFormat = new Intl.ListFormat(this.i18n.locale, { type: 'conjunction' });

  protected readonly week = signal<DayHours[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly message = signal<{ text: string; error: boolean } | null>(null);

  /** The seven days from Monday, with their hours ready to show. */
  protected readonly rows = computed<DayRow[]>(() =>
    WEEK_ORDER.map((weekday) => this.week().find((d) => d.weekday === weekday))
      .filter((d): d is DayHours => !!d)
      .map((d) => ({ weekday: d.weekday, day: this.dayName(d.weekday), open: d.open, hours: this.hoursLabel(d) })),
  );

  constructor() {
    addIcons({ micOutline });
  }

  ngOnInit(): void {
    this.loading.set(true);
    this.businessHours.get().subscribe({
      next: (week) => {
        this.week.set(week);
        this.loading.set(false);
      },
      error: () => {
        this.message.set({ text: this.i18n.t('settings.hours.loadError'), error: true });
        this.loading.set(false);
      },
    });
  }

  /**
   * Opens the assistant: asks aloud which days and hours the barber works, listens (or takes the
   * typed answer), saves the week and reads back what was saved.
   */
  protected ask(): Promise<void> {
    if (this.saving() || this.loading()) return Promise.resolve();
    this.message.set(null);
    return this.assistant.run(async () => {
      let question = this.i18n.t('settings.hours.assistant.question');
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const heard = await this.assistant.ask(question);
        const change = parseWeeklyHours(heard, this.week());
        if (change) {
          await this.saveWeek(change.week, change.changed);
          return;
        }
        question = this.i18n.t('settings.hours.assistant.notUnderstood');
      }
      await this.finish(this.i18n.t('settings.hours.assistant.giveUp'), true);
    });
  }

  private async saveWeek(week: DayHours[], changed: number[]): Promise<void> {
    this.assistant.prompt.set(this.i18n.t('settings.hours.assistant.saving'));
    this.saving.set(true);
    let saved: DayHours[];
    try {
      saved = await firstValueFrom(this.businessHours.update(week));
      this.week.set(saved);
    } catch (err) {
      const status = (err as HttpErrorResponse).status;
      await this.finish(this.i18n.t(status === 400 ? 'settings.hours.errors.invalid' : 'settings.errors.server'), true);
      return;
    } finally {
      this.saving.set(false);
    }
    const summary = this.summary(saved.filter((d) => changed.includes(d.weekday)));
    await this.finish(this.i18n.t('settings.hours.assistant.saved', { summary }), false);
  }

  /** Shows the outcome under the list and in the popup, which reads it aloud. */
  private finish(text: string, error: boolean): Promise<void> {
    this.message.set({ text, error });
    return this.assistant.finish(text, error);
  }

  /** "lunes a viernes de 8:00 a. m. a 6:00 p. m.; domingo cerrado": consecutive equal days together. */
  private summary(days: DayHours[]): string {
    const ordered = WEEK_ORDER.map((w) => days.find((d) => d.weekday === w)).filter((d): d is DayHours => !!d);
    const groups: DayHours[][] = [];
    for (const day of ordered) {
      const last = groups[groups.length - 1];
      const previous = last?.[last.length - 1];
      const consecutive = previous && WEEK_ORDER.indexOf(day.weekday) === WEEK_ORDER.indexOf(previous.weekday) + 1;
      if (consecutive && this.sameHours(previous, day)) last.push(day);
      else groups.push([day]);
    }
    return groups
      .map((group) => {
        const days = this.daysLabel(group.map((d) => d.weekday));
        const [first] = group;
        return first.open
          ? this.i18n.t('settings.hours.summary.open', { days, range: this.hoursLabel(first) })
          : this.i18n.t('settings.hours.summary.closed', { days });
      })
      .join('; ');
  }

  private sameHours(a: DayHours, b: DayHours): boolean {
    return a.open === b.open && (!a.open || (a.openHour === b.openHour && a.closeHour === b.closeHour));
  }

  /** "sábado", "lunes y martes", "lunes a viernes". */
  private daysLabel(weekdays: number[]): string {
    const names = weekdays.map((w) => this.dayName(w));
    if (names.length < 3) return this.listFormat.format(names);
    return this.i18n.t('settings.blocks.range', { from: names[0], to: names[names.length - 1] });
  }

  private dayName(weekday: number): string {
    const date = new Date(A_SUNDAY);
    date.setDate(A_SUNDAY.getDate() + weekday);
    return this.dayNames.format(date);
  }

  /** "8:00 a. m. a 6:00 p. m." or "Cerrado". */
  private hoursLabel(day: DayHours): string {
    if (!day.open) return this.i18n.t('settings.hours.closed');
    return this.i18n.t('settings.blocks.range', { from: this.hourLabel(day.openHour), to: this.hourLabel(day.closeHour) });
  }

  private hourLabel(hour: number): string {
    return hour === 24
      ? this.i18n.t('settings.blocks.midnight')
      : formatTime12(`${String(hour).padStart(2, '0')}:00`, this.i18n.meridiemLabels());
  }
}
