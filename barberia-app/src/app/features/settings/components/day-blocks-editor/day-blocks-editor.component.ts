import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { alertCircle, checkmarkCircle, close, mic, micOutline, sendOutline, trashOutline } from 'ionicons/icons';
import { firstValueFrom, forkJoin, of, catchError } from 'rxjs';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MessageKey } from '../../../../core/i18n/messages.es';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { toLocalIsoDate } from '../../../../shared/utils/date.util';
import { formatTime12, formatTimeRange } from '../../../../shared/utils/time.util';
import { VoiceError } from '../../../assistant/models/voice-error';
import { VoiceService } from '../../../assistant/services/voice.service';
import { DayHours, TimeBlock } from '../../models/business-hours.model';
import { BusinessHoursService } from '../../services/business-hours.service';
import { mergeBlock, parseUnavailability } from '../../utils/unavailability-phrase';

/** Used when the business hours cannot be loaded: 07:00 to midnight. */
const FALLBACK_HOURS: Pick<DayHours, 'open' | 'openHour' | 'closeHour'> = { open: true, openHour: 7, closeHour: 24 };

/** Times the assistant asks when it cannot read an hour range. */
const MAX_ATTEMPTS = 2;

/** How long the outcome stays in the popup after it is read aloud. */
const RESULT_PAUSE_MS = 1200;

interface ClashingAppointment {
  client: string;
  time: string;
}

/** The barber closed the assistant. */
class AssistantCancelled extends Error {}

/**
 * Today's availability: lists the hours the barber blocked and lets them add one by telling the
 * assistant (voice or typed) at what time they will not be available. Each change is saved at once.
 */
@Component({
  selector: 'app-day-blocks-editor',
  templateUrl: 'day-blocks-editor.component.html',
  styleUrls: ['day-blocks-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, FormsModule, TranslatePipe],
})
export class DayBlocksEditorComponent implements OnInit {
  private readonly businessHours = inject(BusinessHoursService);
  private readonly voice = inject(VoiceService);
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

  /** The assistant panel is open. */
  protected readonly asking = signal(false);
  /** What the assistant is saying or asking right now. */
  protected readonly prompt = signal('');
  protected readonly listening = signal(false);
  /** Shown when the microphone failed: the barber can still type the answer. */
  protected readonly voiceHint = signal<string | null>(null);
  /** What the barber said or typed last, shown in the popup. */
  protected readonly heard = signal<string | null>(null);
  /** Outcome shown in the popup while the assistant reads it aloud, before it closes. */
  protected readonly result = signal<'ok' | 'error' | null>(null);
  protected typed = '';

  /** Settles the question being asked: with what was heard or typed, or rejected on cancel. */
  private answer: { resolve: (text: string) => void; reject: (error: unknown) => void } | null = null;
  private cancelled = false;

  constructor() {
    addIcons({ alertCircle, checkmarkCircle, close, mic, micOutline, sendOutline, trashOutline });
    inject(DestroyRef).onDestroy(() => this.cancel());
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
  protected async ask(): Promise<void> {
    if (this.asking() || this.saving()) return;
    this.asking.set(true);
    this.cancelled = false;
    this.message.set(null);
    this.heard.set(null);
    this.result.set(null);
    try {
      let question = this.i18n.t('settings.blocks.assistant.question');
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const heard = await this.askOnce(question);
        this.heard.set(heard);
        const block = parseUnavailability(heard, this.hours(), new Date().getHours());
        if (block) {
          await this.addBlock(block);
          return;
        }
        question = this.i18n.t('settings.blocks.assistant.notUnderstood');
      }
      await this.finish(this.i18n.t('settings.blocks.assistant.giveUp'), true);
    } catch (error) {
      if (!(error instanceof AssistantCancelled)) {
        console.error('Availability assistant failed', error);
        await this.finish(this.i18n.t('settings.errors.server'), true);
      }
    } finally {
      this.asking.set(false);
      this.listening.set(false);
      this.voiceHint.set(null);
      this.heard.set(null);
      this.result.set(null);
      this.typed = '';
    }
  }

  /** Sends the typed answer instead of speaking. */
  protected submitTyped(): void {
    const text = this.typed.trim();
    if (!text || !this.answer) return;
    this.typed = '';
    this.answer.resolve(text);
    this.voice.stop();
  }

  /** Closes the assistant without saving anything. */
  protected cancel(): void {
    if (!this.asking()) return;
    this.cancelled = true;
    this.answer?.reject(new AssistantCancelled());
    this.voice.stop();
    this.voice.stopSpeaking();
  }

  protected remove(index: number): void {
    this.save(this.blocks().filter((_, i) => i !== index)).catch(() => undefined);
  }

  /** Says the question, then waits for whichever comes first: the spoken or the typed answer. */
  private async askOnce(question: string): Promise<string> {
    this.prompt.set(question);
    this.voiceHint.set(null);
    let pending!: { resolve: (text: string) => void; reject: (error: unknown) => void };
    const answer = new Promise<string>((resolve, reject) => (pending = { resolve, reject }));
    this.answer = pending;
    try {
      await this.voice.speak(question);
      if (this.cancelled) throw new AssistantCancelled();

      this.listening.set(true);
      this.voice.listen().then(
        (heard) => pending.resolve(heard),
        (error: unknown) => {
          this.listening.set(false);
          if (!this.cancelled) this.voiceHint.set(this.voiceErrorText(error));
        },
      );
      return await answer;
    } finally {
      this.listening.set(false);
      this.answer = null;
    }
  }

  private async addBlock(block: TimeBlock): Promise<void> {
    const range = this.rangeLabel(block);
    this.prompt.set(this.i18n.t('settings.blocks.assistant.saving', { range }));
    try {
      await this.save(mergeBlock(this.blocks(), block));
      await this.finish(this.i18n.t('settings.blocks.assistant.saved', { range }), false);
    } catch (err) {
      await this.finish(this.errorText(err as HttpErrorResponse), true);
    }
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

  /** Shows the outcome in the popup and under the list, and reads it aloud before the popup closes. */
  private async finish(text: string, error: boolean): Promise<void> {
    this.message.set({ text, error });
    this.prompt.set(text);
    this.result.set(error ? 'error' : 'ok');
    if (this.cancelled) return;
    await this.voice.speak(text);
    // Leaves the outcome on screen a moment after the voice ends.
    await new Promise((resolve) => setTimeout(resolve, RESULT_PAUSE_MS));
  }

  private hourLabel(hour: number): string {
    return hour === 24
      ? this.i18n.t('settings.blocks.midnight')
      : formatTime12(`${String(hour).padStart(2, '0')}:00`, this.i18n.meridiemLabels());
  }

  private voiceErrorText(error: unknown): string {
    const code = error instanceof VoiceError ? error.code : 'recognizer';
    const keys: Record<VoiceError['code'], MessageKey> = {
      'permission-denied': 'assistant.errors.permissionDenied',
      unavailable: 'assistant.errors.unavailable',
      unsupported: 'assistant.errors.unsupported',
      'no-speech': 'settings.blocks.assistant.noSpeech',
      network: 'assistant.errors.voiceNetwork',
      recognizer: 'assistant.errors.recognizer',
    };
    return `${this.i18n.t(keys[code])} ${this.i18n.t('settings.blocks.assistant.typeInstead')}`;
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
