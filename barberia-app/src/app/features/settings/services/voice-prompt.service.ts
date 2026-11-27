import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MessageKey } from '../../../core/i18n/messages.es';
import { VoiceError } from '../../assistant/models/voice-error';
import { VoiceService } from '../../assistant/services/voice.service';

/** How long the outcome stays in the popup after it is read aloud. */
const RESULT_PAUSE_MS = 1200;

/** The barber closed the assistant. */
class AssistantCancelled extends Error {}

/**
 * State and flow of the settings voice popup: asks aloud, listens or takes the typed answer, and
 * reads the outcome before closing. Provide it in each component that has its own popup.
 */
@Injectable()
export class VoicePromptService implements OnDestroy {
  private readonly voice = inject(VoiceService);
  private readonly i18n = inject(I18nService);

  /** The popup is open. */
  readonly open = signal(false);
  /** What the assistant is saying or asking right now. */
  readonly prompt = signal('');
  readonly listening = signal(false);
  /** Shown when the microphone failed: the barber can still type the answer. */
  readonly voiceHint = signal<string | null>(null);
  /** What the barber said or typed last. */
  readonly heard = signal<string | null>(null);
  /** Outcome shown while the assistant reads it aloud, before the popup closes. */
  readonly result = signal<'ok' | 'error' | null>(null);

  /** Settles the question being asked: with what was heard or typed, or rejected on cancel. */
  private answer: { resolve: (text: string) => void; reject: (error: unknown) => void } | null = null;
  /** A conversation is still running; after the popup is closed it ends right away. */
  private running = false;
  /** Rejects when the barber closes the popup, so nothing waits on a voice that never ends. */
  private closed: Promise<never> = new Promise<never>(() => undefined);
  private close: () => void = () => undefined;

  ngOnDestroy(): void {
    this.cancel();
  }

  /**
   * Opens the popup and runs `conversation` in it. Closing the popup ends it quietly; any other
   * failure is logged and read aloud as a server error. The popup closes when it ends.
   */
  async run(conversation: () => Promise<void>): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.closed = new Promise<never>((_, reject) => (this.close = () => reject(new AssistantCancelled())));
    this.closed.catch(() => undefined);
    this.reset();
    this.open.set(true);
    try {
      await conversation();
    } catch (error) {
      if (!(error instanceof AssistantCancelled)) {
        console.error('Settings voice assistant failed', error);
        await this.finish(this.i18n.t('settings.errors.server'), true).catch(() => undefined);
      }
    } finally {
      this.reset();
      this.running = false;
    }
  }

  /** Says the question, then waits for whichever comes first: the spoken or the typed answer. */
  async ask(question: string): Promise<string> {
    this.prompt.set(question);
    this.voiceHint.set(null);
    let pending!: { resolve: (text: string) => void; reject: (error: unknown) => void };
    const answer = new Promise<string>((resolve, reject) => (pending = { resolve, reject }));
    this.answer = pending;
    try {
      // The native voice does not always settle `speak()` when it is stopped: do not wait for it.
      await Promise.race([this.voice.speak(question), this.closed]);

      this.listening.set(true);
      this.voice.listen().then(
        (heard) => pending.resolve(heard),
        (error: unknown) => {
          if (this.answer !== pending) return;
          this.listening.set(false);
          this.voiceHint.set(this.voiceErrorText(error));
        },
      );
      const heard = await Promise.race([answer, this.closed]);
      this.heard.set(heard);
      return heard;
    } finally {
      if (this.answer === pending) {
        this.listening.set(false);
        this.answer = null;
      }
    }
  }

  /** Shows the outcome in the popup and reads it aloud, leaving it a moment on screen. */
  async finish(text: string, error: boolean): Promise<void> {
    this.prompt.set(text);
    this.result.set(error ? 'error' : 'ok');
    await Promise.race([this.voice.speak(text), this.closed]);
    await Promise.race([new Promise((resolve) => setTimeout(resolve, RESULT_PAUSE_MS)), this.closed]);
  }

  /** Answers the question with the typed text instead of speaking. */
  submit(text: string): void {
    if (!text || !this.answer) return;
    this.answer.resolve(text);
    this.voice.stop();
  }

  /** Closes the popup at once, without saving anything, and silences the voice and microphone. */
  cancel(): void {
    if (!this.open()) return;
    this.close();
    this.reset();
    this.voice.stop();
    this.voice.stopSpeaking();
  }

  private reset(): void {
    this.open.set(false);
    this.listening.set(false);
    this.voiceHint.set(null);
    this.heard.set(null);
    this.result.set(null);
    this.answer = null;
  }

  private voiceErrorText(error: unknown): string {
    const code = error instanceof VoiceError ? error.code : 'recognizer';
    const keys: Record<VoiceError['code'], MessageKey> = {
      'permission-denied': 'assistant.errors.permissionDenied',
      unavailable: 'assistant.errors.unavailable',
      unsupported: 'assistant.errors.unsupported',
      'no-speech': 'settings.assistant.noSpeech',
      network: 'assistant.errors.voiceNetwork',
      recognizer: 'assistant.errors.recognizer',
    };
    return `${this.i18n.t(keys[code])} ${this.i18n.t('settings.assistant.typeInstead')}`;
  }
}
