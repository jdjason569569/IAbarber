import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { AlertController, IonicModule, ModalController, ToastController } from '@ionic/angular/lazy';
import type { RefresherCustomEvent } from '@ionic/core';
import { addIcons } from 'ionicons';
import {
  callOutline,
  cut,
  chatbubbleEllipses,
  checkmark,
  checkmarkCircle,
  chevronBack,
  chevronForward,
  close,
  closeCircle,
  createOutline,
  handLeftOutline,
  keypad,
  mic,
  refresh,
  send,
} from 'ionicons/icons';
import { FeedbackService } from '../../../core/feedback/feedback.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PushNotificationsService } from '../../../core/notifications/push-notifications.service';
import type { AppointmentReminder, OverdueAlert } from '../../../core/notifications/push-notifications.service';
import { MessageKey } from '../../../core/i18n/messages.es';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { PesosPipe } from '../../../shared/pipes/pesos.pipe';
import { parseIsoDate, toLocalIsoDate } from '../../../shared/utils/date.util';
import {
  BookedSummaryComponent,
  BookedSummaryRow,
} from '../../assistant/components/booked-summary/booked-summary.component';
import { SendProgressComponent } from '../../assistant/components/send-progress/send-progress.component';
import {
  BookedAppointment,
  BookingAnswers,
  BookingDraft,
  BookingStep,
  BookingTurnResult,
} from '../../assistant/models/assistant.model';
import { VoiceError } from '../../assistant/models/voice-error';
import { Appointment } from '../models/appointment.model';
import { AssistantService } from '../../assistant/services/assistant.service';
import { VoiceService } from '../../assistant/services/voice.service';
import { AppointmentService } from '../services/appointment.service';
import { overdueToday } from '../utils/overdue-appointments';
import { detectCommand } from '../utils/voice-commands';
import type { VoiceCommand } from '../utils/voice-commands';
import { DayHours } from '../../settings/models/business-hours.model';
import { BusinessHoursService } from '../../settings/services/business-hours.service';
import { TimeRangePipe } from '../../../shared/pipes/time-range.pipe';
import { SwipeActionDirective } from '../../../shared/directives/swipe-action.directive';
import { Tilt3dDirective } from '../../../shared/directives/tilt-3d.directive';
import { replayStagger } from '../../../shared/utils/stagger.util';
import { APPOINTMENT_MINUTES, formatTime12, formatTimeRange, toMinutes } from '../../../shared/utils/time.util';

/** Used when the business hours cannot be loaded: 07:00 to midnight. */
const FALLBACK_HOURS: Pick<DayHours, 'open' | 'openHour' | 'closeHour'> = { open: true, openHour: 7, closeHour: 24 };

/** Default seconds the user has to answer each question. */
const LISTEN_SECONDS = 10;

/** The send bar creeps towards this percent while waiting; the server answer completes it. */
const SEND_PROGRESS_CAP = 90;
const SEND_PROGRESS_TICK_MS = 200;
/** How long the full bar stays visible before the next question. */
const SEND_PROGRESS_DONE_MS = 300;

const QUESTION_KEYS: Record<BookingStep, MessageKey> = {
  client: 'assistant.question.client',
  date: 'assistant.question.date',
  time: 'assistant.question.time',
  price: 'assistant.question.price',
};

const STEP_LABEL_KEYS: Record<BookingStep, MessageKey> = {
  client: 'assistant.step.client',
  date: 'assistant.step.date',
  time: 'assistant.step.time',
  price: 'assistant.step.price',
};

/** Extra attempts per question (not hearing the answer, or failing to send it) before the dialog gives up. */
const MAX_RETRIES = 2;
/** Pause before re-sending an answer that failed to reach the server. */
const SEND_RETRY_DELAY_MS = 1000;

/** State changes offered on each appointment of the list; each one has its texts under `appointments.<action>`. */
type RowAction = 'cancel' | 'reactivate' | 'complete' | 'uncomplete';

/** Set once the barber hides the swipe hint; it is not shown again on this phone. */
const SWIPE_HINT_HIDDEN_KEY = 'barberia.swipeHintHidden';
/** The "hold longer" toast is not repeated within this time. */
const SWIPE_TIP_COOLDOWN_MS = 4000;

/** Thrown inside the dialog when the user presses cancel. */
class DialogCancelled extends Error {}

/** How long the overdue cards pulse after "Revisar ahora". */
const OVERDUE_ATTENTION_MS = 6000;

/** How long a compact appointment takes to unfold, and to fold back. */
const UNFOLD_MS = 900;
const FOLD_MS = 500;

@Component({
  selector: 'app-appointment-list',
  templateUrl: 'appointment-list.page.html',
  styleUrls: ['appointment-list.page.scss', 'appointment-compact.scss', 'appointment-overdue.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe, PesosPipe, TimeRangePipe, SendProgressComponent, Tilt3dDirective, SwipeActionDirective],
})
export class AppointmentListPage {
  private readonly appointmentService = inject(AppointmentService);
  private readonly assistant = inject(AssistantService);
  private readonly voice = inject(VoiceService);
  private readonly businessHours = inject(BusinessHoursService);
  private readonly i18n = inject(I18nService);
  private readonly alertController = inject(AlertController);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly pushNotifications = inject(PushNotificationsService);
  private readonly host: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly feedback = inject(FeedbackService);

  /** Hint above the list on how to complete / cancel with the swipe, while there is something to swipe. */
  private readonly swipeHintHidden = signal(localStorage.getItem(SWIPE_HINT_HIDDEN_KEY) === '1');
  protected readonly showSwipeHint = computed(
    () => !this.swipeHintHidden() && this.dayAppointments().some((a) => this.isActive(a)),
  );
  private lastSwipeTipAt = 0;

  protected readonly loading = signal(false);
  /** Completed or cancelled appointment the barber opened to edit or undo; the others stay compact. */
  protected readonly expandedId = signal<number | null>(null);
  /** Overdue appointments pointed out after "Revisar ahora": their cards pulse for a few seconds. */
  protected readonly attentionIds = signal<number[]>([]);
  /** The overdue popup is open: a second alert while it is shown does not stack another one. */
  private overdueAlertOpen = false;
  protected readonly error = signal<string | null>(null);
  protected readonly listening = signal(false);
  protected readonly countdown = signal(LISTEN_SECONDS);
  protected readonly dialogActive = signal(false);
  protected readonly assistantReply = signal<string | null>(null);
  /** What was heard (or typed) for the current question; null while waiting for it. */
  protected readonly dialogAnswer = signal<string | null>(null);
  /** Goes up with every question shown; the modal re-renders the question so its flash replays. */
  protected readonly questionTick = signal(0);
  /** Answers given so far in the running dialog, one per question; a repeated question replaces its entry. */
  protected readonly dialogLog = signal<{ step: BookingStep; answer: string }[]>([]);
  protected readonly stepLabels = STEP_LABEL_KEYS;
  /** Every answer is in: the modal shows them with Confirm / Edit / Cancel before sending. */
  protected readonly reviewing = signal(false);
  /** Resolves the pending review when the user taps Confirm or Edit; null when not reviewing. */
  private reviewChoice: ((choice: 'confirm' | 'edit') => void) | null = null;
  /** The review rows turned into fields to fix the answers. */
  protected readonly editingAnswers = signal(false);
  /** Values typed in the edit fields, by step. */
  private editedValues: BookingAnswers = {};
  /** Ends the edit: true saves the typed values, false goes back without changes. */
  private editDone: ((save: boolean) => void) | null = null;
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

  /** Appointments of the selected day, earliest first: later hours always go to the bottom. */
  protected readonly dayAppointments = computed(() =>
    this.appointments()
      .filter((a) => a.date === this.selectedDate())
      .sort((a, b) => toMinutes(a.time) - toMinutes(b.time) || a.id - b.id),
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

  /** "Cliente casual" button: registers a client served right now; the assistant only asks for the price. */
  protected onWalkInClick(): void {
    if (this.dialogActive()) {
      return;
    }
    this.selectedDate.set(toLocalIsoDate(new Date()));
    void this.onMicClick(false, { walkIn: true });
  }

  /** Start times (`HH:mm`) still free today: open, not blocked, not taken and not already past. */
  private async freeSlotsToday(): Promise<string[]> {
    const now = new Date();
    const today = toLocalIsoDate(now);
    const [week, blocks] = await Promise.all([
      firstValueFrom(this.businessHours.get()).catch(() => null),
      firstValueFrom(this.businessHours.getBlocks(today)).catch(() => []),
    ]);
    const hours = week?.find((d) => d.weekday === now.getDay()) ?? FALLBACK_HOURS;
    // Walk-ins and completed appointments do not hold a slot; each booking takes APPOINTMENT_MINUTES.
    const taken = this.appointments()
      .filter((a) => a.date === today && !a.cancelled && !a.walkIn && !a.completed)
      .map((a) => toMinutes(a.time));
    const free: string[] = [];
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    for (
      let minutes = hours.openHour * 60;
      hours.open && minutes < hours.closeHour * 60;
      minutes += APPOINTMENT_MINUTES
    ) {
      const hour = Math.floor(minutes / 60);
      const time = `${String(hour).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      const blocked = blocks.some((b) => hour >= b.fromHour && hour < b.toHour);
      const clashes = taken.some((start) => Math.abs(start - minutes) < APPOINTMENT_MINUTES);
      if (minutes > nowMinutes && !clashes && !blocked) {
        free.push(time);
      }
    }
    return free;
  }

  /**
   * "Preguntar" button: asks what the barber needs, listens (or reads the typed text) and answers
   * aloud. Known questions: free hours today and the next appointment (see detectCommand).
   */
  protected async onAskClick(): Promise<void> {
    if (this.dialogActive()) {
      return;
    }
    this.textMode.set(false);
    this.dialogActive.set(true);
    this.cancelled = new Promise<never>((_, reject) => (this.cancelDialog = () => reject(new DialogCancelled())));
    this.cancelled.catch(() => undefined);
    try {
      let question = this.i18n.t('commands.question');
      for (let attempt = 0; ; attempt++) {
        this.showQuestion(question);
        this.dialogAnswer.set(null);
        await this.untilCancelled(this.voice.speak(question));
        const heard = await this.awaitAnswer(question, LISTEN_SECONDS);
        this.dialogAnswer.set(heard);
        const command = detectCommand(heard);
        if (command === null && attempt < MAX_RETRIES) {
          question = this.i18n.t('commands.notUnderstood');
          continue;
        }
        const reply = command === null ? this.i18n.t('commands.help') : await this.answerCommand(command);
        this.assistantReply.set(reply);
        await this.untilCancelled(this.voice.speak(reply));
        return;
      }
    } catch (error) {
      if (error instanceof DialogCancelled) {
        this.assistantReply.set(this.i18n.t('commands.cancelled'));
      } else {
        console.error('Voice command failed', error);
        this.assistantReply.set(this.i18n.t(this.assistantErrorKey(error)));
      }
    } finally {
      this.cancelDialog = null;
      this.listening.set(false);
      this.dialogAnswer.set(null);
      this.textMode.set(false);
      this.dialogActive.set(false);
    }
  }

  private async answerCommand(command: VoiceCommand): Promise<string> {
    switch (command) {
      case 'availability':
        return this.availabilitySpeech(await this.freeSlotsToday());
      case 'next':
        return this.nextAppointmentSpeech();
    }
  }

  /** "La siguiente cita es con Juan a las 3:30 p. m., en 20 minutos." for today's next booking still to start. */
  private nextAppointmentSpeech(): string {
    const now = new Date();
    const today = toLocalIsoDate(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const next = this.appointments()
      .filter((a) => a.date === today && !a.cancelled && !a.walkIn && !a.completed && toMinutes(a.time) >= nowMinutes)
      .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))[0];
    if (!next) {
      return this.i18n.t('commands.next.none');
    }
    const time = formatTime12(next.time, this.i18n.meridiemLabels());
    const minutes = toMinutes(next.time) - nowMinutes;
    if (minutes < 60) {
      return minutes <= 1
        ? this.i18n.t('commands.next.now', { client: next.clientName, time })
        : this.i18n.t('commands.next.soon', { client: next.clientName, time, minutes });
    }
    return this.i18n.t('commands.next.later', { client: next.clientName, time });
  }

  /**
   * Free slots read aloud as ranges, so consecutive half hours are not listed one by one:
   * ["14:00", "14:30", "17:00"] -> "Hoy tienes disponible de 2:00 p. m. a 3:00 p. m. y de 5:00 p. m. a 5:30 p. m.".
   */
  private availabilitySpeech(free: string[]): string {
    if (free.length === 0) {
      return this.i18n.t('appointments.availability.none');
    }
    const ranges: { from: number; to: number }[] = [];
    for (const start of free.map(toMinutes)) {
      const last = ranges.at(-1);
      if (last && last.to === start) {
        last.to = start + APPOINTMENT_MINUTES;
      } else {
        ranges.push({ from: start, to: start + APPOINTMENT_MINUTES });
      }
    }
    const labels = this.i18n.meridiemLabels();
    const clock = (minutes: number) =>
      formatTime12(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`, labels);
    const parts = ranges.map((r) =>
      this.i18n.t('appointments.availability.speechRange', { from: clock(r.from), to: clock(r.to) }),
    );
    return this.i18n.t('appointments.availability.speech', {
      ranges: new Intl.ListFormat(this.i18n.locale, { type: 'conjunction' }).format(parts),
    });
  }

  private readonly answerInput = viewChild<ElementRef<HTMLIonInputElement>>('answerInput');

  constructor() {
    addIcons({
      callOutline,
      cut,
      chatbubbleEllipses,
      checkmark,
      checkmarkCircle,
      chevronBack,
      chevronForward,
      close,
      closeCircle,
      createOutline,
      handLeftOutline,
      keypad,
      mic,
      refresh,
      send,
    });
    // A client just booked on WhatsApp (push received or tapped): show it without pulling to refresh.
    this.pushNotifications.bookingReceived$
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.refresh());
    // An appointment starts in a few minutes: say it aloud (unless the assistant is talking) and show it.
    this.pushNotifications.reminderReceived$
      .pipe(takeUntilDestroyed())
      .subscribe((reminder) => void this.announceReminder(reminder));
    // Appointments that ended and are still active: popup, voice and a shortcut to close them by hand.
    this.pushNotifications.overdueReceived$
      .pipe(takeUntilDestroyed())
      .subscribe((alert) => void this.reviewOverdue(alert));
    // A client just booked: say who (unless the assistant is talking).
    this.pushNotifications.speechReceived$
      .pipe(takeUntilDestroyed())
      .subscribe((speech) => {
        if (!this.dialogActive()) void this.voice.speak(speech);
      });
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
    replayStagger(this.host);
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
  protected async onMicClick(startInText = false, initialDraft: BookingDraft = {}): Promise<void> {
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
    this.cancelled = new Promise<never>((_, reject) => (this.cancelDialog = () => reject(new DialogCancelled())));
    // Nothing may be waiting on it when the user cancels; that is not an unhandled error.
    this.cancelled.catch(() => undefined);
    // What was saved; its summary is shown once the voice modal has closed.
    let booked: BookingDraft | null = null;
    try {
      let draft: BookingDraft = initialDraft;
      // The questions are asked locally; the API reads every answer in one preview request and
      // returns the clean values, which the user reviews before the draft is sent again to be saved.
      // A rejected answer (day closed, hour taken...) comes back as a reply that asks it again.
      let rejected: BookingTurnResult | null = null;
      // Answers fixed in the review; they are read again without asking their questions.
      let edited: BookingAnswers = {};
      while (true) {
        const answers: BookingAnswers = edited;
        edited = {};
        for (const step of missingSteps(draft).filter((s) => !answers[s])) {
          const question = rejected?.reply ?? this.i18n.t(QUESTION_KEYS[step]);
          const seconds = rejected?.listenSeconds ?? LISTEN_SECONDS;
          rejected = null;
          this.showQuestion(question);
          this.dialogAnswer.set(null);
          await this.untilCancelled(this.voice.speak(question));
          answers[step] = await this.awaitAnswer(question, seconds);
          this.dialogAnswer.set(answers[step]!);
          this.logAnswer(step, answers[step]!);
        }
        let turn = await this.withSendRetries(() => this.sendAnswers(answers, draft, true));
        // Last draft read by the API; a saved booking comes back with an empty draft.
        const sent = turn.draft;
        draft = turn.draft;
        this.showDraft(draft);
        if (turn.status === 'ready') {
          edited = await this.reviewDraft();
          if (Object.keys(edited).length > 0) {
            draft = withoutSteps(draft, Object.keys(edited) as BookingStep[]);
            continue;
          }
          const confirmed = draft;
          turn = await this.withSendRetries(() => this.sendAnswers({}, confirmed));
          draft = turn.draft;
        }
        if (turn.status === 'asking') {
          rejected = turn;
          continue;
        }
        this.assistantReply.set(turn.reply);
        this.dialogAnswer.set(null);
        await this.untilCancelled(this.voice.speak(turn.reply));
        if (turn.status === 'created') {
          this.refresh();
          booked = bookedDraft(turn.appointment, sent);
        }
        return;
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
      this.dialogAnswer.set(null);
      this.dialogLog.set([]);
      this.reviewing.set(false);
      this.reviewChoice = null;
      this.textMode.set(false);
      this.dialogActive.set(false);
      if (booked) {
        void this.showBookedSummary(booked);
      }
    }
  }

  /**
   * Shows the values the API read with Confirm / Edit / Cancel and waits for the user. Resolves
   * with no answers on Confirm, or with the fields the user changed so they are read again.
   */
  private async reviewDraft(): Promise<BookingAnswers> {
    const prompt = this.i18n.t('assistant.review.title');
    this.assistantReply.set(prompt);
    this.reviewing.set(true);
    try {
      while (true) {
        const choice = new Promise<'confirm' | 'edit'>((resolve) => (this.reviewChoice = resolve));
        void this.voice.speak(prompt);
        if ((await this.untilCancelled(choice)) === 'confirm') {
          this.voice.stopSpeaking();
          return {};
        }
        this.voice.stopSpeaking();
        const edited = await this.editAnswers();
        if (Object.keys(edited).length > 0) {
          for (const [step, answer] of Object.entries(edited) as [BookingStep, string][]) {
            this.logAnswer(step, answer);
          }
          return edited;
        }
      }
    } finally {
      this.reviewChoice = null;
      this.editDone = null;
      this.editingAnswers.set(false);
      this.reviewing.set(false);
    }
  }

  /** Replaces the answers shown in the modal with the clean values the API read from them. */
  private showDraft(draft: BookingDraft): void {
    const steps: BookingStep[] = draft.walkIn ? ['price'] : ['client', 'date', 'time', 'price'];
    this.dialogLog.set(
      steps.flatMap((step) => {
        const value = this.formatDraftValue(step, draft);
        return value === null ? [] : [{ step, answer: value }];
      }),
    );
  }

  /** How a value of the draft reads in the review: "sábado, 31 de octubre de 2026", "$20.000 COP". */
  private formatDraftValue(step: BookingStep, draft: BookingDraft): string | null {
    switch (step) {
      case 'client':
        return draft.client ?? null;
      case 'date':
        return draft.date
          ? new Intl.DateTimeFormat(this.i18n.locale, { dateStyle: 'full' }).format(parseIsoDate(draft.date))
          : null;
      case 'time':
        // The booking's half hour on the 12-hour clock: "1:00 – 1:30 p. m.".
        return draft.time ? formatTimeRange(draft.time, this.i18n.meridiemLabels()) : null;
      case 'price':
        return draft.price === undefined ? null : this.i18n.money(draft.price);
    }
  }

  /** Card telling what the assistant just saved, so the barber can check it. */
  private async showBookedSummary(draft: BookingDraft): Promise<void> {
    const icons: Record<Exclude<BookingStep, 'price'>, string> = {
      client: 'person-outline',
      date: 'calendar-outline',
      time: 'time-outline',
    };
    const steps = draft.walkIn ? [] : (['client', 'date', 'time'] as const);
    const rows: BookedSummaryRow[] = steps.flatMap((step) => {
      const value = this.formatDraftValue(step, draft);
      return value === null ? [] : [{ icon: icons[step], label: STEP_LABEL_KEYS[step], value }];
    });
    const modal = await this.modalController.create({
      component: BookedSummaryComponent,
      componentProps: {
        title: draft.walkIn ? 'assistant.booked.walkInTitle' : 'assistant.booked.title',
        rows,
        price: this.formatDraftValue('price', draft),
      },
      cssClass: 'booked-summary-modal',
    });
    await modal.present();
  }

  /** Turns the review rows into fields; resolves with the answers that changed (none on Back). */
  private async editAnswers(): Promise<BookingAnswers> {
    const log = this.dialogLog();
    this.editedValues = Object.fromEntries(log.map((entry) => [entry.step, entry.answer]));
    this.editingAnswers.set(true);
    try {
      const save = await this.untilCancelled(new Promise<boolean>((resolve) => (this.editDone = resolve)));
      const changed: BookingAnswers = {};
      if (save) {
        for (const entry of log) {
          const value = (this.editedValues[entry.step] ?? '').trim();
          if (value && value !== entry.answer) changed[entry.step] = value;
        }
      }
      return changed;
    } finally {
      this.editDone = null;
      this.editingAnswers.set(false);
    }
  }

  protected onEditInput(step: BookingStep, event: Event): void {
    this.editedValues[step] = (event as CustomEvent<{ value?: string | null }>).detail.value ?? '';
  }

  protected onEditSave(): void {
    this.editDone?.(true);
  }

  protected onEditBack(): void {
    this.editDone?.(false);
  }

  protected onReviewConfirm(): void {
    this.reviewChoice?.('confirm');
  }

  protected onReviewEdit(): void {
    this.reviewChoice?.('edit');
  }

  /** Shows a new question in the modal and makes it flash to catch the user's eye. */
  private showQuestion(question: string): void {
    this.assistantReply.set(question);
    this.questionTick.update((tick) => tick + 1);
  }

  /** Notes the answer under its question; answering the same question again replaces it in place. */
  private logAnswer(step: BookingStep, answer: string): void {
    this.dialogLog.update((log) =>
      log.some((entry) => entry.step === step)
        ? log.map((entry) => (entry.step === step ? { step, answer } : entry))
        : [...log, { step, answer }],
    );
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
        this.showQuestion(retry);
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

  /** Sends every answer to the assistant while a progress bar fills up from 0 to 100 %. */
  private async sendAnswers(answers: BookingAnswers, draft: BookingDraft, preview = false): Promise<BookingTurnResult> {
    this.sendProgress.set(0);
    const timer = setInterval(() => {
      const current = this.sendProgress() ?? 0;
      // Each tick covers a tenth of the remaining distance, so the bar slows down near the cap.
      this.sendProgress.set(Math.ceil(current + (SEND_PROGRESS_CAP - current) / 10));
    }, SEND_PROGRESS_TICK_MS);
    try {
      const turn = await this.untilCancelled(firstValueFrom(this.assistant.submitBooking(answers, draft, preview)));
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
        case 'network': return 'assistant.errors.voiceNetwork';
        case 'recognizer': return 'assistant.errors.recognizer';
      }
    }
    if (isNetworkError(error)) {
      return 'assistant.errors.server';
    }
    return 'assistant.errors.generic';
  }

  /** Lets the barber fix the client name or the price (said wrong to the assistant, or a walk-in's name). */
  protected async openEdit(appointment: Appointment): Promise<void> {
    const alert = await this.alertController.create({
      header: this.i18n.t('appointments.edit.title'),
      inputs: [
        {
          name: 'client',
          type: 'text',
          value: appointment.clientName,
          placeholder: this.i18n.t('appointments.edit.client'),
          attributes: { 'aria-label': this.i18n.t('appointments.edit.client') },
        },
        {
          name: 'price',
          type: 'number',
          min: 0,
          value: appointment.serviceCost,
          placeholder: this.i18n.t('appointments.edit.price'),
          attributes: { 'aria-label': this.i18n.t('appointments.edit.price'), inputmode: 'decimal' },
        },
      ],
      buttons: [
        { text: this.i18n.t('appointments.edit.cancel'), role: 'cancel' },
        {
          text: this.i18n.t('appointments.edit.save'),
          handler: (values: { client?: string; price?: string }) => {
            const client = (values.client ?? '').trim();
            const price = Number(values.price);
            if (!client || values.price === '' || !Number.isFinite(price) || price < 0) {
              void this.showError('appointments.edit.invalid');
              // Keeps the alert open so the barber can fix the value.
              return false;
            }
            this.save(appointment, client, price);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private save(appointment: Appointment, client: string, price: number): void {
    if (client === appointment.clientName && price === appointment.serviceCost) {
      return;
    }
    this.appointmentService.update(appointment.id, client, price).subscribe({
      next: (updated) =>
        this.appointments.update((items) => items.map((a) => (a.id === updated.id ? updated : a))),
      error: () => void this.showError('appointments.edit.error'),
    });
  }

  private async announceReminder({ client, minutes, message }: AppointmentReminder): Promise<void> {
    const toast = await this.toastController.create({
      // The API's phrase calls the barber by name; the catalog text covers older APIs.
      message: message ?? this.i18n.t('notifications.reminder', { client, minutes }),
      duration: 8000,
      cssClass: 'barber-toast',
      icon: 'cut',
      position: 'top',
    });
    await toast.present();
    // Speaking now would cut off the assistant's own question.
    if (this.dialogActive()) return;
    const speech =
      message ??
      (minutes === 1
        ? this.i18n.t('notifications.reminderSpeechOne', { client })
        : this.i18n.t('notifications.reminderSpeech', { client, minutes }));
    await this.voice.speak(speech);
  }

  /**
   * The API found appointments of today that already ended and are still active. With fresh data,
   * the popup lists them, the assistant says it aloud (unless the phone already read the push) and
   * "Revisar ahora" takes the barber to the cards, to complete or cancel each one by swiping.
   */
  private async reviewOverdue({ speak }: OverdueAlert): Promise<void> {
    if (this.overdueAlertOpen) return;
    let items: Appointment[];
    try {
      items = await firstValueFrom(this.appointmentService.getAppointments());
    } catch {
      return;
    }
    this.appointments.set(items);
    const overdue = overdueToday(items);
    if (overdue.length === 0 || this.overdueAlertOpen) return;

    const labels = this.i18n.meridiemLabels();
    const lines = overdue.map((a) =>
      this.i18n.t('appointments.overdue.line', { time: formatTime12(a.time, labels), client: a.clientName }),
    );
    this.overdueAlertOpen = true;
    const alert = await this.alertController.create({
      header: this.i18n.t(overdue.length === 1 ? 'appointments.overdue.titleOne' : 'appointments.overdue.title', {
        count: overdue.length,
      }),
      message: this.i18n.t('appointments.overdue.message', { list: lines.join('\n') }),
      cssClass: ['overdue-alert', 'barber-notice'],
      backdropDismiss: false,
      buttons: [
        { text: this.i18n.t('appointments.overdue.later'), role: 'cancel' },
        { text: this.i18n.t('appointments.overdue.review'), handler: () => this.goToOverdue(overdue) },
      ],
    });
    void alert.onDidDismiss().then(() => {
      this.overdueAlertOpen = false;
      this.voice.stopSpeaking();
    });
    await alert.present();
    if (speak && !this.dialogActive()) {
      const list = new Intl.ListFormat(this.i18n.locale, { type: 'conjunction' }).format(
        overdue.map((a) =>
          this.i18n.t('appointments.overdue.speechItem', { client: a.clientName, time: formatTime12(a.time, labels) }),
        ),
      );
      const key: MessageKey = overdue.length === 1 ? 'appointments.overdue.speechOne' : 'appointments.overdue.speechMany';
      await this.voice.speak(this.i18n.t(key, { count: overdue.length, list }));
    }
  }

  /** Shows today and scrolls to the first overdue card; the overdue cards pulse for a few seconds. */
  private goToOverdue(overdue: Appointment[]): void {
    this.selectedDate.set(toLocalIsoDate(new Date()));
    const ids = overdue.map((a) => a.id);
    this.attentionIds.set(ids);
    setTimeout(() => {
      this.host
        .querySelector(`[data-appt-id="${ids[0]}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    setTimeout(() => this.attentionIds.set([]), OVERDUE_ATTENTION_MS);
  }

  private async showError(key: MessageKey): Promise<void> {
    const toast = await this.toastController.create({
      message: this.i18n.t(key),
      duration: 3000,
      color: 'danger',
    });
    await toast.present();
  }

  /** Asks for confirmation before changing the state of an appointment (each action has its own texts). */
  protected async confirmAction(action: RowAction, appointment: Appointment): Promise<void> {
    const alert = await this.alertController.create({
      header: this.i18n.t(`appointments.${action}.title`),
      message: this.i18n.t(`appointments.${action}.message`, {
        client: appointment.clientName,
        date: appointment.date,
        time: formatTime12(appointment.time, this.i18n.meridiemLabels()),
      }),
      buttons: [
        { text: this.i18n.t(`appointments.${action}.no`), role: 'cancel' },
        {
          text: this.i18n.t(`appointments.${action}.confirm`),
          role: action === 'cancel' ? 'destructive' : undefined,
          handler: () => this.runAction(action, appointment),
        },
      ],
    });
    await alert.present();
  }

  /** Completed and cancelled appointments matter less: they show as a small card until tapped. */
  protected isCompact(appointment: Appointment): boolean {
    return !this.isActive(appointment) && this.expandedId() !== appointment.id;
  }

  /** Tapping a closed appointment opens its details and actions; tapping it again folds it back. */
  protected toggleDetails(appointment: Appointment, event: Event): void {
    if (this.isActive(appointment)) return;
    // The buttons and the phone inside an open card do their own thing.
    if ((event.target as HTMLElement).closest('ion-button, .appt-phone')) return;
    const card = event.currentTarget as HTMLElement;
    const opening = this.expandedId() !== appointment.id;
    const from = card.offsetHeight;
    this.expandedId.set(opening ? appointment.id : null);
    // Applies the new size now, so the height it ends at can be measured and animated to.
    this.changeDetector.detectChanges();
    this.unfold(card, from, opening);
  }

  /**
   * Slow unfold: the card grows from its compact height to the full one (or shrinks back) while the
   * details come in one after another (`.unfolding` in appointment-compact.scss).
   */
  private unfold(card: HTMLElement, from: number, opening: boolean): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    card.classList.toggle('unfolding', opening);
    const to = card.offsetHeight;
    card.getAnimations().filter((a) => a.id === 'unfold').forEach((a) => a.cancel());
    const animation = card.animate([{ height: `${from}px`, overflow: 'hidden' }, { height: `${to}px`, overflow: 'hidden' }], {
      duration: opening ? UNFOLD_MS : FOLD_MS,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      id: 'unfold',
    });
    animation.finished.then(
      () => card.classList.remove('unfolding'),
      () => undefined,
    );
  }

  /** Only appointments still to be served can be swiped to complete or cancel. */
  protected isActive(appointment: Appointment): boolean {
    return !appointment.cancelled && !appointment.completed;
  }

  /**
   * The barber held the card 0.5 s and swiped it: no confirmation (the gesture is deliberate and both
   * actions can be undone from the card). Success plays a sound and a celebration.
   */
  protected onSwiped(action: 'complete' | 'cancel', appointment: Appointment): void {
    this.runAction(action, appointment, () => {
      if (action === 'complete') {
        this.feedback.playSuccess();
        this.feedback.celebrate(this.i18n.t('appointments.swipe.completed'), 'success');
      } else {
        this.feedback.playFailure();
        this.feedback.celebrate(this.i18n.t('appointments.swipe.cancelled'), 'failure');
      }
    });
  }

  /** The finger was lifted before the 1 second: explain the gesture (not more than once in a while). */
  protected async onSwipeTooShort(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSwipeTipAt < SWIPE_TIP_COOLDOWN_MS) return;
    this.lastSwipeTipAt = now;
    const toast = await this.toastController.create({
      message: this.i18n.t('appointments.swipe.tooShort'),
      duration: 3000,
      position: 'top',
      icon: 'hand-left-outline',
    });
    await toast.present();
  }

  protected hideSwipeHint(): void {
    localStorage.setItem(SWIPE_HINT_HIDDEN_KEY, '1');
    this.swipeHintHidden.set(true);
  }

  /** Cancel and complete can be undone, in case the barber tapped the wrong appointment. */
  private runAction(action: RowAction, appointment: Appointment, onDone?: () => void): void {
    const request = {
      cancel: () => this.appointmentService.setCancelled(appointment.id, true),
      reactivate: () => this.appointmentService.setCancelled(appointment.id, false),
      complete: () => this.appointmentService.setCompleted(appointment.id, true),
      uncomplete: () => this.appointmentService.setCompleted(appointment.id, false),
    }[action];
    request().subscribe({
      next: (updated) => {
        this.appointments.update((items) => items.map((a) => (a.id === updated.id ? updated : a)));
        onDone?.();
      },
      error: (error: unknown) => {
        // Reactivating fails with 409/400 when the slot was taken or blocked meanwhile.
        const slotLost =
          action === 'reactivate' && error instanceof HttpErrorResponse && [400, 409].includes(error.status);
        void this.showError(slotLost ? 'appointments.reactivate.taken' : `appointments.${action}.error`);
      },
    });
  }

  /** Status badge: completed wins over active; cancelled appointments are never completed. */
  protected stateKey(appointment: Appointment): MessageKey {
    if (appointment.cancelled) return 'appointments.state.cancelled';
    return appointment.completed ? 'appointments.state.completed' : 'appointments.state.active';
  }

  protected stateColor(appointment: Appointment): string {
    if (appointment.cancelled) return 'danger';
    // Completed is green too; its card (.completed) mutes everything but the badge text.
    return 'success';
  }

  /** Opens the phone's dialer (Capacitor hands `tel:` links to Android). */
  protected callClient(phone: string): void {
    window.location.href = `tel:+${phone}`;
  }

  /** "573001234567" → "300 123 4567" (Colombian mobile); other numbers are shown with "+" as stored. */
  protected displayPhone(phone: string): string {
    const local = phone.length === 12 && phone.startsWith('57') ? phone.slice(2) : null;
    return local && /^3\d{9}$/.test(local)
      ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
      : `+${phone}`;
  }

  protected total(appointment: Appointment): number {
    return this.appointmentService.getTotal(appointment);
  }
}


/** A request that never got an answer: HttpErrorResponse (status 0 included) or the 20 s timeout. */
/** Questions still to ask, in the same order the API expects them; a walk-in only needs the price. */
function missingSteps(draft: BookingDraft): BookingStep[] {
  if (draft.walkIn) {
    return draft.price === undefined ? ['price'] : [];
  }
  const steps: BookingStep[] = [];
  if (!draft.client) steps.push('client');
  if (!draft.date) steps.push('date');
  if (!draft.time) steps.push('time');
  if (draft.price === undefined) steps.push('price');
  return steps;
}

/** What was saved, as a draft for the summary; the draft sent is used if the API omits it. */
function bookedDraft(appointment: BookedAppointment | undefined, sent: BookingDraft): BookingDraft {
  if (!appointment) {
    return sent;
  }
  return appointment.walkIn
    ? { walkIn: true, price: appointment.serviceCost }
    : { client: appointment.client, date: appointment.date, time: appointment.time, price: appointment.serviceCost };
}

/** The draft without the given steps, so their new answers are read again. */
function withoutSteps(draft: BookingDraft, steps: BookingStep[]): BookingDraft {
  const rest = { ...draft };
  for (const step of steps) {
    delete rest[step];
  }
  return rest;
}

function isNetworkError(error: unknown): boolean {
  return error instanceof HttpErrorResponse || (error instanceof Error && error.name === 'TimeoutError');
}
