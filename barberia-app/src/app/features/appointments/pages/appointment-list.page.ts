import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { mic, micOutline } from 'ionicons/icons';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MessageKey } from '../../../core/i18n/messages.es';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { BookingDraft } from '../../assistant/models/assistant.model';
import { VoiceError } from '../../assistant/models/voice-error';
import { Appointment } from '../models/appointment.model';
import { AssistantService } from '../../assistant/services/assistant.service';
import { VoiceService } from '../../assistant/services/voice.service';
import { AppointmentService } from '../services/appointment.service';

@Component({
  selector: 'app-appointment-list',
  templateUrl: 'appointment-list.page.html',
  styleUrls: ['appointment-list.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class AppointmentListPage {
  private readonly appointmentService = inject(AppointmentService);
  private readonly assistant = inject(AssistantService);
  private readonly voice = inject(VoiceService);
  private readonly i18n = inject(I18nService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly listening = signal(false);
  protected readonly dialogActive = signal(false);
  protected readonly assistantReply = signal<string | null>(null);
  protected readonly appointments = signal<Appointment[]>([]);

  constructor() {
    addIcons({ mic, micOutline });
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.appointmentService.getAppointments().subscribe({
      next: (items) => {
        this.appointments.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.i18n.t('appointments.loadError'));
        this.loading.set(false);
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
      let turn = await firstValueFrom(this.assistant.bookingTurn('', draft));
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
        this.listening.set(true);
        const answer = await this.voice.listen();
        this.listening.set(false);
        this.assistantReply.set(`"${answer}"`);
        turn = await firstValueFrom(this.assistant.bookingTurn(answer, draft));
      }
    } catch (error) {
      console.error('Voice dialog failed', error);
      this.assistantReply.set(this.i18n.t(this.assistantErrorKey(error)));
    } finally {
      this.listening.set(false);
      this.dialogActive.set(false);
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
    // A request that never got an answer: HttpErrorResponse (status 0 included) or the 20 s timeout.
    if (error instanceof HttpErrorResponse || (error instanceof Error && error.name === 'TimeoutError')) {
      return 'assistant.errors.server';
    }
    return 'assistant.errors.generic';
  }

  protected statusLabel(status: string): string {
    return this.i18n.t(`status.${status}` as MessageKey);
  }

  protected total(appointment: Appointment): number {
    return this.appointmentService.getTotal(appointment);
  }

  protected statusColor(status: string): string {
    switch (status) {
      case 'confirmed': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'warning';
    }
  }
}
