import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline } from 'ionicons/icons';
import { forkJoin, of, catchError } from 'rxjs';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MessageKey } from '../../../../core/i18n/messages.es';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { toLocalIsoDate } from '../../../../shared/utils/date.util';
import { DayHours, TimeBlock } from '../../models/business-hours.model';
import { BusinessHoursService } from '../../services/business-hours.service';

/** Used when the business hours cannot be loaded: 07:00 to midnight. */
const FALLBACK_HOURS: Pick<DayHours, 'open' | 'openHour' | 'closeHour'> = { open: true, openHour: 7, closeHour: 24 };

interface ClashingAppointment {
  client: string;
  time: string;
}

/** Lets the barber mark, for today only, from what hour to what hour they are not available. */
@Component({
  selector: 'app-day-blocks-editor',
  templateUrl: 'day-blocks-editor.component.html',
  styleUrls: ['day-blocks-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class DayBlocksEditorComponent implements OnInit {
  private readonly businessHours = inject(BusinessHoursService);
  private readonly i18n = inject(I18nService);

  private readonly today = toLocalIsoDate(new Date());
  protected readonly todayLabel = new Intl.DateTimeFormat(this.i18n.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  protected readonly hours = signal<Pick<DayHours, 'open' | 'openHour' | 'closeHour'>>(FALLBACK_HOURS);
  protected readonly blocks = signal<TimeBlock[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly message = signal<{ text: string; error: boolean } | null>(null);

  /** Start hours offered: every opening hour of today. */
  protected readonly startHours = computed(() => range(this.hours().openHour, this.hours().closeHour - 1));
  protected readonly endHours = computed(() => range(this.hours().openHour + 1, this.hours().closeHour));

  /** A new block starts where the last one ends; none can be added once the day is covered. */
  protected readonly canAdd = computed(() => this.nextStart() < this.hours().closeHour);

  /** True when two blocks overlap; the server rejects that too. */
  protected readonly overlapping = computed(() => {
    const sorted = [...this.blocks()].sort((a, b) => a.fromHour - b.fromHour);
    return sorted.some((b, i) => i > 0 && b.fromHour < sorted[i - 1].toHour);
  });

  constructor() {
    addIcons({ addOutline, trashOutline });
  }

  ngOnInit(): void {
    this.loading.set(true);
    forkJoin({
      week: this.businessHours.get().pipe(catchError(() => of(null))),
      blocks: this.businessHours.getBlocks(this.today),
    }).subscribe({
      next: ({ week, blocks }) => {
        this.hours.set(week?.find((d) => d.weekday === new Date().getDay()) ?? FALLBACK_HOURS);
        this.blocks.set(blocks);
        this.loading.set(false);
      },
      error: () => {
        this.message.set({ text: this.i18n.t('settings.blocks.loadError'), error: true });
        this.loading.set(false);
      },
    });
  }

  /** `7` -> "07:00"; `24` -> the "midnight" label. */
  protected hourLabel(hour: number): string {
    return hour === 24 ? this.i18n.t('settings.blocks.midnight') : `${String(hour).padStart(2, '0')}:00`;
  }

  protected add(): void {
    const fromHour = this.nextStart();
    this.update((blocks) => [...blocks, { fromHour, toHour: fromHour + 1 }]);
  }

  protected remove(index: number): void {
    this.update((blocks) => blocks.filter((_, i) => i !== index));
  }

  protected setFrom(index: number, fromHour: number): void {
    // Keep the range valid: the end moves one hour after the new start when needed.
    this.update((blocks) =>
      blocks.map((b, i) => (i === index ? { fromHour, toHour: Math.max(b.toHour, fromHour + 1) } : b)),
    );
  }

  protected setTo(index: number, toHour: number): void {
    this.update((blocks) => blocks.map((b, i) => (i === index ? { ...b, toHour } : b)));
  }

  protected save(): void {
    if (this.saving() || this.overlapping()) {
      return;
    }
    this.saving.set(true);
    this.message.set(null);
    this.businessHours.updateBlocks(this.today, this.blocks()).subscribe({
      next: (blocks) => {
        this.blocks.set(blocks);
        this.dirty.set(false);
        this.saving.set(false);
        this.message.set({ text: this.i18n.t('settings.blocks.saved'), error: false });
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.message.set({ text: this.errorText(err), error: true });
      },
    });
  }

  private errorText(err: HttpErrorResponse): string {
    if (err.status === 409) {
      const appointments = (err.error?.appointments ?? []) as ClashingAppointment[];
      const list = appointments.map((a) => `${a.time.slice(0, 5)} ${a.client}`).join(', ');
      return this.i18n.t('settings.blocks.errors.clash', { appointments: list });
    }
    const key: MessageKey = err.status === 400 ? 'settings.blocks.errors.invalid' : 'settings.errors.server';
    return this.i18n.t(key);
  }

  private nextStart(): number {
    const blocks = this.blocks();
    const nowHour = new Date().getHours() + 1;
    const start = blocks.length > 0 ? Math.max(...blocks.map((b) => b.toHour)) : nowHour;
    return Math.max(start, this.hours().openHour);
  }

  private update(change: (blocks: TimeBlock[]) => TimeBlock[]): void {
    this.blocks.update(change);
    this.dirty.set(true);
    this.message.set(null);
  }
}

/** Whole numbers from `from` to `to`, both included. */
function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(to - from + 1, 0) }, (_, i) => from + i);
}
