import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AlertController, IonicModule, ToastController } from '@ionic/angular/lazy';
import type { RefresherCustomEvent } from '@ionic/core';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, mic, micOutline } from 'ionicons/icons';
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

  /** Alert listing today's hours that are still free (open, not taken and not already past). */
  protected async showAvailability(): Promise<void> {
    const now = new Date();
    const today = toLocalIsoDate(now);
    const week = await firstValueFrom(this.businessHours.get()).catch(() => null);
    const hours = week?.find((d) => d.weekday === now.getDay()) ?? FALLBACK_HOURS;
    const taken = new Set(
      this.appointments()
        .filter((a) => a.date === today && !a.cancelled)
        .map((a) => a.time.slice(0, 5)),
    );
    const free: string[] = [];
    for (let hour = hours.openHour; hours.open && hour < hours.closeHour; hour++) {
      const time = `${String(hour).padStart(2, '0')}:00`;
      if (hour > now.getHours() && !taken.has(time)) {
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

  constructor() {
    addIcons({ chevronBack, chevronForward, mic, micOutline });
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

  /** Guided dialog: the assistant asks, the user answers by voice, until the appointment is saved. */
  protected async onMicClick(): Promise<void> {
    if (this.dialogActive()) {
      return;
    }
    this.dialogActive.set(true);
    this.assistantReply.set(this.i18n.t('assistant.connecting'));
    try {
      let draft: BookingDraft = {};
      let turn = await this.withSendRetries(() => firstValueFrom(this.assistant.bookingTurn('', draft)));
      while (true) {
        this.assistantReply.set(turn.reply);
        draft = turn.draft;
        await this.voice.speak(turn.reply);
        if (turn.status !== 'asking') {
          if (turn.status === 'created') {
            this.refresh();
          }
          return;
        }
        const answer = await this.listenWithRetries(turn.reply, turn.listenSeconds ?? LISTEN_SECONDS);
        this.assistantReply.set(`"${answer}"`);
        const sentDraft = draft;
        turn = await this.withSendRetries(() => this.sendAnswer(answer, sentDraft));
      }
    } catch (error) {
      console.error('Voice dialog failed', error);
      this.assistantReply.set(this.i18n.t(this.assistantErrorKey(error)));
    } finally {
      this.listening.set(false);
      this.sendProgress.set(null);
      this.dialogActive.set(false);
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
        if (!(error instanceof VoiceError && error.code === 'no-speech') || attempt >= MAX_RETRIES) {
          throw error;
        }
        const retry = this.i18n.t('assistant.retry.listen', { question });
        this.assistantReply.set(retry);
        await this.voice.speak(retry);
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
        await new Promise((resolve) => setTimeout(resolve, SEND_RETRY_DELAY_MS));
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
      const turn = await firstValueFrom(this.assistant.bookingTurn(answer, draft));
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
      return await this.voice.listen();
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
