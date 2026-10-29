import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { I18nService } from '../../../core/i18n/i18n.service';
import { VoiceError, VoiceErrorCode } from '../models/voice-error';

interface WebSpeechRecognition {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}

type WebSpeechRecognitionCtor = new () => WebSpeechRecognition;

/** A native session rejected faster than this never really listened. */
const NATIVE_EARLY_FAILURE_MS = 1000;
/** Gives the speech service time to release the previous session before retrying. */
const NATIVE_RETRY_DELAY_MS = 500;
/**
 * Rejection messages of the speech-recognition plugin (`getErrorText` on Android). Errors without
 * their own text, such as "language not supported", come back as UNKNOWN.
 */
const NATIVE_ERRORS = {
  noMatch: 'No match',
  speechTimeout: 'No speech input',
  network: ['Network error', 'Network timeout', 'error from server'],
  permissions: 'Insufficient permissions',
  unknown: "Didn't understand, please try again.",
};

interface NativeAttempt {
  transcript?: string;
  /** Plugin rejection message, when the session failed. */
  error?: string;
  failedEarly: boolean;
}

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly language = inject(I18nService).speechLocale;
  private webRecognition: WebSpeechRecognition | null = null;
  /** Set once the device recognizer rejected the app locale; later sessions use the device language. */
  private useDeviceLanguage = false;

  /** Reads the text aloud and resolves when finished (or immediately if unsupported). */
  speak(text: string): Promise<void> {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      // Some WebViews never fire `onend`; do not let that freeze the dialog.
      const timer = setTimeout(resolve, Math.max(4000, text.length * 90));
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.language;
      utterance.onend = done;
      utterance.onerror = done;
      synth.cancel();
      synth.speak(utterance);
    });
  }

  /** Cuts off whatever is being read aloud; the pending `speak()` resolves. */
  stopSpeaking(): void {
    window.speechSynthesis?.cancel();
  }

  /** Listens once and resolves with the transcript. Rejects if nothing was captured. */
  listen(): Promise<string> {
    return Capacitor.isNativePlatform() ? this.listenNative() : this.listenWeb();
  }

  /** Ends the current listening session early; the pending `listen()` resolves with what was heard. */
  stop(): void {
    if (Capacitor.isNativePlatform()) {
      void SpeechRecognition.stop().catch(() => undefined);
    } else {
      this.webRecognition?.stop();
    }
  }

  private async listenNative(): Promise<string> {
    const { available } = await SpeechRecognition.available();
    if (!available) {
      throw new VoiceError('unavailable');
    }
    const { speechRecognition } = await SpeechRecognition.requestPermissions();
    if (speechRecognition !== 'granted') {
      throw new VoiceError('permission-denied');
    }
    let attempt = await this.listenNativeOnce(this.useDeviceLanguage ? undefined : this.language);
    // Some recognizers (common on Latin American phones) do not support the app locale and fail with
    // the generic message. Fall back to the device language and remember it for the next sessions.
    if (!attempt.transcript && !this.useDeviceLanguage && attempt.error === NATIVE_ERRORS.unknown) {
      attempt = await this.listenNativeOnce(undefined);
      this.useDeviceLanguage = !!attempt.transcript;
    }
    if (attempt.transcript) {
      return attempt.transcript;
    }
    throw new VoiceError(this.nativeErrorCode(attempt.error));
  }

  /**
   * Listens once in the given language (`undefined` = device language). The plugin destroys the previous
   * recognizer when a new session starts; that service disconnect can reject the new session instantly
   * while the microphone keeps running. Retry once in that case.
   */
  private async listenNativeOnce(language: string | undefined): Promise<NativeAttempt> {
    let attempt = await this.startNative(language);
    if (attempt.failedEarly) {
      await new Promise((resolve) => setTimeout(resolve, NATIVE_RETRY_DELAY_MS));
      attempt = await this.startNative(language);
    }
    return attempt;
  }

  /** Runs one native session; `failedEarly` flags a rejection too fast to be a real "no speech". */
  private async startNative(language: string | undefined): Promise<NativeAttempt> {
    const startedAt = Date.now();
    try {
      const result = await SpeechRecognition.start({
        ...(language ? { language } : {}),
        maxResults: 1,
        popup: false,
        partialResults: false,
      });
      return { transcript: result?.matches?.[0], failedEarly: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Shows up in `adb logcat` (Capacitor/Console) to diagnose phones where voice fails.
      console.warn(`[Voice] recognition failed (language: ${language ?? 'device'}): ${message}`);
      return { error: message, failedEarly: Date.now() - startedAt < NATIVE_EARLY_FAILURE_MS };
    }
  }

  private nativeErrorCode(error: string | undefined): VoiceErrorCode {
    if (!error || error === NATIVE_ERRORS.noMatch || error === NATIVE_ERRORS.speechTimeout) {
      return 'no-speech';
    }
    if (NATIVE_ERRORS.network.includes(error)) {
      return 'network';
    }
    if (error === NATIVE_ERRORS.permissions) {
      return 'permission-denied';
    }
    return 'recognizer';
  }

  private listenWeb(): Promise<string> {
    const w = window as unknown as {
      SpeechRecognition?: WebSpeechRecognitionCtor;
      webkitSpeechRecognition?: WebSpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      return Promise.reject(new VoiceError('unsupported'));
    }
    return new Promise((resolve, reject) => {
      const recognition = new Ctor();
      this.webRecognition = recognition;
      recognition.lang = this.language;
      recognition.interimResults = false;
      recognition.onresult = (event) => resolve(event.results[0][0].transcript);
      recognition.onerror = (event) =>
        reject(new VoiceError(webErrorCode(event.error)));
      recognition.start();
    });
  }
}

function webErrorCode(error: string): VoiceErrorCode {
  switch (error) {
    case 'not-allowed': return 'permission-denied';
    case 'network': return 'network';
    case 'language-not-supported': return 'recognizer';
    default: return 'no-speech';
  }
}
