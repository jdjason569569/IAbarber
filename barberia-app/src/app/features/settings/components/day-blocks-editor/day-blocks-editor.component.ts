import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { micOutline, trashOutline } from 'ionicons/icons';
import { firstValueFrom, forkJoin, of, catchError } from 'rxjs';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MessageKey } from '../../../../core/i18n/messages.es';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { toLocalIsoDate } from '../../../../shared/utils/date.util';
import { formatTime12, formatTimeRange } from '../../../../shared/utils/time.util';
import { DayHours, TimeBlock } from '../../models/business-hours.model';
import { BusinessHoursService } from '../../services/business-hours.service';
import { VoicePromptService } from '../../services/voice-prompt.service';
import { mergeBlock, parseUnavailability } from '../../utils/unavailability-phrase';
import { VoicePromptModalComponent } from '../voice-prompt-modal/voice-prompt-modal.component';

/** Used when the business hours cannot be loaded: 07:00 to midnight. */
const FALLBACK_HOURS: Pick<DayHours, 'open' | 'openHour' | 'closeHour'> = { open: true, openHour: 7, closeHour: 24 };

/** Times the assistant asks when it cannot read an hour range. */
const MAX_ATTEMPTS = 2;

interface ClashingAppointment {
  client: string;
  time: string;
}

/**
 * Today's availability: lists the hours the barber blocked and lets them add one by telling the
 * assistant (voice or typed) at what time they will not be available. Each change is saved at once.
 */
@Component({
  selector: 'app-day-blocks-editor',
  templateUrl: 'day-blocks-editor.component.html',
  styleUrls: ['day-blocks-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe, VoicePromptModalComponent],
  providers: [VoicePromptService],
})
export class DayBlocksEditorComponent implements OnInit {
  private readonly businessHours = inject(BusinessHoursService);
  protected readonly assistant = inject(VoicePromptService);
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
  protected readonly message = signal<{ text: string; error: boolean } | null>(null);

  constructor() {
    addIcons({ micOutline, trashOutline });
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

  /** "2:00 p. m. a 4:00 p. m."; the end 24 is shown as midnight. */
  protected rangeLabel(block: TimeBlock): string {
    return this.i18n.t('settings.blocks.range', {
      from: this.hourLabel(block.fromHour),
      to: this.hourLabel(block.toHour),
    });
  }

  /**
   * Opens the assistant: asks aloud at what time the barber will not be available, listens (or
   * takes the typed answer), saves the block and confirms aloud.
   */
  protected ask(): Promise<void> {
    if (this.saving()) return Promise.resolve();
    this.message.set(null);
    return this.assistant.run(async () => {
      let question = this.i18n.t('settings.blocks.assistant.question');
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const heard = await this.assistant.ask(question);
        const block = parseUnavailability(heard, this.hours(), new Date().getHours());
        if (block) {
          await this.addBlock(block);
          return;
        }
        question = this.i18n.t('settings.blocks.assistant.notUnderstood');
      }
      await this.finish(this.i18n.t('settings.blocks.assistant.giveUp'), true);
    });
  }

  protected remove(index: number): void {
    this.save(this.blocks().filter((_, i) => i !== index)).catch(() => undefined);
  }

  private async addBlock(block: TimeBlock): Promise<void> {
    const range = this.rangeLabel(block);
    this.assistant.prompt.set(this.i18n.t('settings.blocks.assistant.saving', { range }));
    try {
      await this.save(mergeBlock(this.blocks(), block));
    } catch (err) {
      await this.finish(this.errorText(err as HttpErrorResponse), true);
      return;
    }
    await this.finish(this.i18n.t('settings.blocks.assistant.saved', { range }), false);
  }

  /** Replaces today's blocks on the server; the message shows the result. */
  private async save(blocks: TimeBlock[]): Promise<void> {
    this.saving.set(true);
    this.message.set(null);
    try {
      this.blocks.set(await firstValueFrom(this.businessHours.updateBlocks(this.today, blocks)));
      this.message.set({ text: this.i18n.t('settings.blocks.saved'), error: false });
    } catch (err) {
      this.message.set({ text: this.errorText(err as HttpErrorResponse), error: true });
      throw err;
    } finally {
      this.saving.set(false);
    }
  }

  /** Shows the outcome under the list and in the popup, which reads it aloud. */
  private finish(text: string, error: boolean): Promise<void> {
    this.message.set({ text, error });
    return this.assistant.finish(text, error);
  }

  private hourLabel(hour: number): string {
    return hour === 24
      ? this.i18n.t('settings.blocks.midnight')
      : formatTime12(`${String(hour).padStart(2, '0')}:00`, this.i18n.meridiemLabels());
  }

  private errorText(err: HttpErrorResponse): string {
    if (err.status === 409) {
      const appointments = (err.error?.appointments ?? []) as ClashingAppointment[];
      const list = appointments
        .map((a) => `${formatTimeRange(a.time, this.i18n.meridiemLabels())} ${a.client}`)
        .join(', ');
      return this.i18n.t('settings.blocks.errors.clash', { appointments: list });
    }
    const key: MessageKey = err.status === 400 ? 'settings.blocks.errors.invalid' : 'settings.errors.server';
    return this.i18n.t(key);
  }
}
