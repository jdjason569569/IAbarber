import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { AlertController, IonicModule, ToastController } from '@ionic/angular/lazy';
import type { RefresherCustomEvent } from '@ionic/core';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, close, keypad, mic, send } from 'ionicons/icons';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MessageKey } from '../../../core/i18n/messages.es';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { parseIsoDate, toLocalIsoDate } from '../../../shared/utils/date.util';
import { SendProgressComponent } from '../../assistant/components/send-progress/send-progress.component';
import { BookingDraft, BookingTurnResult } from '../../assistant/models/assistant.model';
import { VoiceError } from '../../assistant/models/voice-error';
import { Appointment } from '../models/appointment.model';
import { AssistantService } from '../../assistant/services/assistant.service';
import { VoiceService } from '../../assistant/services/voice.service';
import { AppointmentService } from '../services/appointment.service';
import { DayHours } from '../../settings/models/business-hours.model';
import { BusinessHoursService } from '../../settings/services/business-hours.service';

/** Used when the business hours cannot be loaded: one-hour slots from 07:00 to midnight. */
const FALLBACK_HOURS: Pick<DayHours, 'open' | 'openHour' | 'closeHour'> = { open: true, openHour: 7, closeHour: 24 };

/** Default seconds the user has to answer each question. */
const LISTEN_SECONDS = 10;

/** The send bar creeps towards this percent while waiting; the server answer completes it. */
const SEND_PROGRESS_CAP = 90;
const SEND_PROGRESS_TICK_MS = 200;
/** How long the full bar stays visible before the next question. */
const SEND_PROGRESS_DONE_MS = 300;

/** Extra attempts per question (not hearing the answer, or failing to send it) before the dialog gives up. */
const MAX_RETRIES = 2;
/** Pause before re-sending an answer that failed to reach the server. */
const SEND_RETRY_DELAY_MS = 1000;

/** Thrown inside the dialog when the user presses cancel. */
class DialogCancelled extends Error {}

@Component({
  selector: 'app-appointment-list',
  templateUrl: 'appointment-list.page.html',
  styleUrls: ['appointment-list.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe, SendProgressComponent],
})
export class AppointmentListPage {
  private readonly appointmentService = inject(AppointmentService);
  private readonly assistant = inject(AssistantService);
  private readonly voice = inject(VoiceService);
  private readonly businessHours = inject(BusinessHoursService);
  private readonly i18n = inject(I18nService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly listening = signal(false);
  protected readonly countdown = signal(LISTEN_SECONDS);
  protected readonly dialogActive = signal(false);
  protected readonly assistantReply = signal<string | null>(null);
  /** Progress (0-100) of the answer being sent to the assistant; null when nothing is being sent. */
  protected readonly sendProgress = signal<number | null>(null);
  /** The user answers by typing instead of speaking (chosen, or forced when the microphone fails). */
  protected readonly textMode = signal(false);
  /** The assistant asked a question and waits for the answer (spoken or typed). */
  protected readonly awaitingAnswer = signal(false);
  protected readonly typedText = signal('');
  /** Resolves the pending question with the typed answer; null when nothing is waiting. */
  private typedAnswer: ((text: string) => void) | null = null;
  /** Wakes up a question waiting for text when the user switches back to voice; null otherwise. */
  private resumeVoice: (() => void) | null = null;
  /** Rejects with DialogCancelled when the user cancels the running dialog. */
  private cancelled: Promise<never> = new Promise<never>(() => undefined);
  /** Cancels the running dialog; null when no dialog is running. */
  private cancelDialog: (() => void) | null = null;
  private readonly appointments = signal<Appointment[]>([]);

  /** Day shown in the list (`YYYY-MM-DD`, device local time). Today by default. */
  protected readonly selectedDate = signal(toLocalIsoDate(new Date()));

  protected readonly dayAppointments = computed(() =>
    this.appointments()
      .filter((a) => a.date === this.selectedDate())
      .sort((a, b) => a.time.localeCompare(b.time)),
  );

  protected readonly dayNumber = computed(() => parseIsoDate(this.selectedDate()).getDate());

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(this.i18n.locale, { month: 'short' }).format(parseIsoDate(this.selectedDate())),
  );

  /** Moves the shown day forward or back by `days`. */
  protected shiftDay(days: number): void {
    const date = parseIsoDate(this.selectedDate());
    date.setDate(date.getDate() + days);
    this.selectedDate.set(toLocalIsoDate(date));
  }

  /** Alert listing today's hours that are still free (open, not blocked, not taken and not already past). */
  protected async showAvailability(): Promise<void> {
    const now = new Date();
    const today = toLocalIsoDate(now);
    const [week, blocks] = await Promise.all([
      firstValueFrom(this.businessHours.get()).catch(() => null),
      firstValueFrom(this.businessHours.getBlocks(today)).catch(() => []),
    ]);
    const hours = week?.find((d) => d.weekday === now.getDay()) ?? FALLBACK_HOURS;
    const taken = new Set(
      this.appointments()
        .filter((a) => a.date === today && !a.cancelled)
        .map((a) => a.time.slice(0, 5)),
    );
    const free: string[] = [];
    for (let hour = hours.openHour; hours.open && hour < hours.closeHour; hour++) {
      const time = `${String(hour).padStart(2, '0')}:00`;
      const blocked = blocks.some((b) => hour >= b.fromHour && hour < b.toHour);
      if (hour > now.getHours() && !taken.has(time) && !blocked) {
        free.push(time);
      }
    }
    const alert = await this.alertController.create({
      header: this.i18n.t('appointments.availability.title'),
      message: free.length > 0 ? free.join(', ') : this.i18n.t('appointments.availability.none'),
      buttons: [this.i18n.t('appointments.availability.close')],
    });
    await alert.present();
  }

  private readonly answerInput = viewChild<ElementRef<HTMLIonInputElement>>('answerInput');

  constructor() {
    addIcons({ chevronBack, chevronForward, close, keypad, mic, send });
    // Text mode opens the keyboard as soon as a question waits for the answer.
    effect(() => {
      const input = this.answerInput();
      if (input && this.textMode() && this.awaitingAnswer()) {
        setTimeout(() => void input.nativeElement.setFocus());
      }
    });
  }

  /** Ionic hook: reload every time the tab is shown, so appointments are never stale. */
  ionViewWillEnter(): void {
    this.refresh();
  }

  /** Pull-to-refresh gesture. */
  protected onPullRefresh(event: RefresherCustomEvent): void {
    this.refresh(() => void event.target.complete());
  }

  refresh(onDone?: () => void): void {
    this.loading.set(true);
    this.error.set(null);
    this.appointmentService.getAppointments().subscribe({
      next: (items) => {
        this.appointments.set(items);
        this.loading.set(false);
        onDone?.();
      },
      error: () => {
        this.error.set(this.i18n.t('appointments.loadError'));
        this.loading.set(false);
        onDone?.();
      },
    });
  }

  /** Guided dialog: the assistant asks, the user answers by voice or text, until the appointment is saved. */
  protected async onMicClick(startInText = false): Promise<void> {
    if (this.dialogActive()) {
      // While a dialog runs, the buttons only switch how the user answers.
      if (startInText) {
        this.switchToText();
      } else {
        this.switchToVoice();
      }
      return;
    }
    this.textMode.set(startInText);
    this.dialogActive.set(true);
    this.assistantReply.set(this.i18n.t('assistant.connecting'));
    this.cancelled = new Promise<never>((_, reject) => (this.cancelDialog = () => reject(new DialogCancelled())));
    // Nothing may be waiting on it when the user cancels; that is not an unhandled error.
    this.cancelled.catch(() => undefined);
    try {
      let draft: BookingDraft = {};
      let turn = await this.withSendRetries(() =>
        this.untilCancelled(firstValueFrom(this.assistant.bookingTurn('', draft))),
      );
      while (true) {
        this.assistantReply.set(turn.reply);
        draft = turn.draft;
        await this.untilCancelled(this.voice.speak(turn.reply));
        if (turn.status !== 'asking') {
          if (turn.status === 'created') {
            this.refresh();
          }
          return;
        }
        const answer = await this.awaitAnswer(turn.reply, turn.listenSeconds ?? LISTEN_SECONDS);
        this.assistantReply.set(`"${answer}"`);
        const sentDraft = draft;
        turn = await this.withSendRetries(() => this.sendAnswer(answer, sentDraft));
      }
    } catch (error) {
      if (error instanceof DialogCancelled) {
        this.assistantReply.set(this.i18n.t('assistant.cancelled'));
      } else {
        console.error('Voice dialog failed', error);
        this.assistantReply.set(this.i18n.t(this.assistantErrorKey(error)));
      }
    } finally {
      this.cancelDialog = null;
      this.listening.set(false);
      this.sendProgress.set(null);
      this.textMode.set(false);
      this.dialogActive.set(false);
    }
  }

  /**
   * Waits for the answer to one question, by voice or by text. The user can switch between both
   * as many times as they want; when the microphone fails it switches to text and keeps the draft.
   */
  private async awaitAnswer(question: string, seconds: number): Promise<string> {
    const typed = new Promise<string>((resolve) => (this.typedAnswer = resolve));
    this.awaitingAnswer.set(true);
    try {
      while (true) {
        if (this.textMode()) {
          const switchedToVoice = new Promise<null>((resolve) => (this.resumeVoice = () => resolve(null)));
          const answer = await this.untilCancelled(Promise.race([typed, switchedToVoice]));
          this.resumeVoice = null;
          if (answer !== null) {
            return answer;
          }
          this.assistantReply.set(question);
          continue;
        }
        const heard = await this.listenWithRetries(question, seconds).catch(async (error: unknown) => {
          if (!(error instanceof VoiceError)) {
            throw error;
          }
          if (!this.textMode()) {
            this.textMode.set(true);
            const fallback = this.i18n.t('assistant.textFallback');
            this.assistantReply.set(fallback);
            await this.untilCancelled(this.voice.speak(fallback));
          }
          return null;
        });
        // Once the user switches to text, whatever the microphone caught is ignored.
        if (heard !== null && !this.textMode()) {
          return heard;
        }
      }
    } finally {
      this.typedAnswer = null;
      this.resumeVoice = null;
      this.awaitingAnswer.set(false);
      this.typedText.set('');
    }
  }

  /** Stops listening and waits for the typed answer. */
  private switchToText(): void {
    if (!this.textMode()) {
      this.textMode.set(true);
      this.voice.stop();
    }
  }

  /** Goes back to answering by voice; a question waiting for text starts listening again. */
  private switchToVoice(): void {
    if (this.textMode()) {
      this.textMode.set(false);
      // Hide the keyboard so the next tap on the field switches to text again.
      (document.activeElement as HTMLElement | null)?.blur();
      this.resumeVoice?.();
    }
  }

  /** Cancel button: ends the running dialog right away, by voice or by text, without saving anything. */
  protected onCancelClick(): void {
    if (!this.cancelDialog) {
      return;
    }
    this.cancelDialog();
    this.voice.stop();
    this.voice.stopSpeaking();
    (document.activeElement as HTMLElement | null)?.blur();
  }

  /** Lets a step of the dialog end early when the user cancels. */
  private untilCancelled<T>(work: Promise<T>): Promise<T> {
    return Promise.race([work, this.cancelled]);
  }

  /** The user focused the answer field: stop listening and wait for the text. */
  protected onTypingStart(): void {
    this.switchToText();
  }

  protected onTypedInput(event: Event): void {
    this.switchToText();
    this.typedText.set((event as CustomEvent<{ value?: string | null }>).detail.value ?? '');
  }

  protected submitTyped(): void {
    const text = this.typedText().trim();
    if (text && this.typedAnswer) {
      this.typedAnswer(text);
    }
  }

  /** Listens for the answer; when nothing is heard, repeats the question up to MAX_RETRIES times. */
  private async listenWithRetries(question: string, seconds: number): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      try {
        this.listening.set(true);
        return await this.listenWithCountdown(seconds);
      } catch (error) {
        this.listening.set(false);
        const giveUp = !(error instanceof VoiceError && error.code === 'no-speech') || attempt >= MAX_RETRIES;
        if (giveUp || this.textMode()) {
          throw error;
        }
        const retry = this.i18n.t('assistant.retry.listen', { question });
        this.assistantReply.set(retry);
        await this.untilCancelled(this.voice.speak(retry));
      } finally {
        this.listening.set(false);
      }
    }
  }

  /** Runs a request to the assistant; on network errors or timeouts tries again up to MAX_RETRIES times. */
  private async withSendRetries(send: () => Promise<BookingTurnResult>): Promise<BookingTurnResult> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await send();
      } catch (error) {
        if (!isNetworkError(error) || attempt >= MAX_RETRIES) {
          throw error;
        }
        this.assistantReply.set(
          this.i18n.t('assistant.retry.send', { attempt: attempt + 1, max: MAX_RETRIES }),
        );
        await this.untilCancelled(new Promise((resolve) => setTimeout(resolve, SEND_RETRY_DELAY_MS)));
      }
    }
  }

  /** Sends one answer to the assistant while a progress bar fills up from 0 to 100 %. */
  private async sendAnswer(answer: string, draft: BookingDraft): Promise<BookingTurnResult> {
    this.sendProgress.set(0);
    const timer = setInterval(() => {
      const current = this.sendProgress() ?? 0;
      // Each tick covers a tenth of the remaining distance, so the bar slows down near the cap.
      this.sendProgress.set(Math.ceil(current + (SEND_PROGRESS_CAP - current) / 10));
    }, SEND_PROGRESS_TICK_MS);
    try {
      const turn = await this.untilCancelled(firstValueFrom(this.assistant.bookingTurn(answer, draft)));
      clearInterval(timer);
      this.sendProgress.set(100);
      await new Promise((resolve) => setTimeout(resolve, SEND_PROGRESS_DONE_MS));
      return turn;
    } finally {
      clearInterval(timer);
      this.sendProgress.set(null);
    }
  }

  /** Listens with a visible countdown; stops the microphone when it reaches zero. */
  private async listenWithCountdown(seconds: number): Promise<string> {
    this.countdown.set(seconds);
    const timer = setInterval(() => {
      const left = this.countdown() - 1;
      this.countdown.set(Math.max(left, 0));
      if (left <= 0) {
        clearInterval(timer);
        this.voice.stop();
      }
    }, 1000);
    try {
      return await this.untilCancelled(this.voice.listen());
    } finally {
      clearInterval(timer);
    }
  }

  private assistantErrorKey(error: unknown): MessageKey {
    if (error instanceof VoiceError) {
      switch (error.code) {
        case 'permission-denied': return 'assistant.errors.permissionDenied';
        case 'unavailable': return 'assistant.errors.unavailable';
        case 'unsupported': return 'assistant.errors.unsupported';
        case 'no-speech': return 'assistant.errors.noSpeech';
      }
    }
    if (isNetworkError(error)) {
      return 'assistant.errors.server';
    }
    return 'assistant.errors.generic';
  }

  protected async confirmCancel(appointment: Appointment): Promise<void> {
    const alert = await this.alertController.create({
      header: this.i18n.t('appointments.cancel.title'),
      message: this.i18n.t('appointments.cancel.message', {
        client: appointment.clientName,
        date: appointment.date,
        time: appointment.time,
      }),
      buttons: [
        { text: this.i18n.t('appointments.cancel.no'), role: 'cancel' },
        {
          text: this.i18n.t('appointments.cancel.confirm'),
          role: 'destructive',
          handler: () => this.cancel(appointment),
        },
      ],
    });
    await alert.present();
  }

  private cancel(appointment: Appointment): void {
    this.appointmentService.setCancelled(appointment.id, true).subscribe({
      next: (updated) =>
        this.appointments.update((items) => items.map((a) => (a.id === updated.id ? updated : a))),
      error: async () => {
        const toast = await this.toastController.create({
          message: this.i18n.t('appointments.cancel.error'),
          duration: 3000,
          color: 'danger',
        });
        await toast.present();
      },
    });
  }

  protected total(appointment: Appointment): number {
    return this.appointmentService.getTotal(appointment);
  }
}

/** A request that never got an answer: HttpErrorResponse (status 0 included) or the 20 s timeout. */
function isNetworkError(error: unknown): boolean {
  return error instanceof HttpErrorResponse || (error instanceof Error && error.name === 'TimeoutError');
}
