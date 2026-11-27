import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { QueueStrategy, TextToSpeech } from '@capacitor-community/text-to-speech';
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

/**
 * Locale of the phone's TTS voice. Google's engine has no es-CO voice and may pick a Spain accent;
 * es-US is its Latin American Spanish.
 */
const NATIVE_TTS_LANG = 'es-US';

/**
 * Google's higher quality "network" voice (synthesized on Google's servers; without internet the
 * engine falls back to the same voice built into the phone). Must match VOICE_NAME in
 * SpeakingMessagingService. Other options: es-us-x-esc-network, es-us-x-esf-network, es-us-x-sfb-network.
 */
const NATIVE_VOICE_NAME = 'es-us-x-esd-network';

/** A little slower than normal sounds less mechanical. Must match SPEECH_RATE in SpeakingMessagingService. */
const NATIVE_SPEECH_RATE = 0.95;

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
  private readonly i18n = inject(I18nService);
  private readonly language = this.i18n.speechLocale;
  private webRecognition: WebSpeechRecognition | null = null;
  /** Set once the device recognizer rejected the app locale; later sessions use the device language. */
  private useDeviceLanguage = false;
  /** Index of NATIVE_VOICE_NAME in the engine's voice list; undefined when the engine lacks it (e.g. Samsung's). */
  private nativeVoice: Promise<number | undefined> | null = null;

  /**
   * Reads the text aloud and resolves when finished (or immediately if unsupported).
   * The Android WebView has no `speechSynthesis`, so the native app uses the phone's TTS engine.
   */
  speak(text: string): Promise<void> {
    const spoken = this.sayTimes(this.sayPesos(text));
    return Capacitor.isNativePlatform() ? this.speakNative(spoken) : this.speakWeb(spoken);
  }

  /**
   * Money is Colombian pesos, but the voice reads "$20.000" as "20 000 dólares". Every amount
   * ("$20000", "$20.000 COP", "$1,500") becomes "20000 pesos"; grouping dots/commas are dropped so the
   * voice reads one whole number ("veinte mil").
   */
  private sayPesos(text: string): string {
    return text.replace(/\$\s?(\d{1,3}(?:[.,]\d{3})+|\d+)(?:\s?COP\b)?/g, (_match, amount: string) =>
      this.i18n.t('money.spoken', { amount: amount.replace(/[.,]/g, '') }),
    );
  }

  /**
   * The voice misreads "10:00 p. m." (it said "10 de la mañana"), so every clock time is said in words:
   * "10:00 p. m." -> "10 de la noche", "2:30 p. m." -> "2 y media de la tarde". In a range whose first
   * end has no meridiem ("1:00 – 1:30 p. m.") that end is said as a bare hour.
   */
  private sayTimes(text: string): string {
    const withMeridiem = text.replace(
      /\b(\d{1,2}):(\d{2})\s*([ap])(?:\.\s?m\.?|m\b)/gi,
      (_match, hour: string, minutes: string, meridiem: string) =>
        this.i18n.t('speech.time', {
          hour: Number(hour),
          minutes: this.spokenMinutes(minutes),
          period: this.spokenPeriod(Number(hour), meridiem.toLowerCase() === 'p'),
        }),
    );
    return withMeridiem
      .replace(/\b(\d{1,2}):(\d{2})\b/g, (_match, hour: string, minutes: string) => `${Number(hour)}${this.spokenMinutes(minutes)}`)
      .replace(/\s*–\s*(?=\d)/g, this.i18n.t('speech.range'));
  }

  private spokenMinutes(minutes: string): string {
    const value = Number(minutes);
    if (value === 0) return '';
    if (value === 30) return this.i18n.t('speech.minutes.half');
    if (value === 15) return this.i18n.t('speech.minutes.quarter');
    return this.i18n.t('speech.minutes.other', { minutes: value });
  }

  /** Part of the day for a 12-hour clock time: 10 p. m. -> "de la noche". */
  private spokenPeriod(hour12: number, pm: boolean): string {
    const hour = (hour12 % 12) + (pm ? 12 : 0);
    if (hour < 6) return this.i18n.t('speech.period.dawn');
    if (hour < 12) return this.i18n.t('speech.period.morning');
    if (hour < 13) return this.i18n.t('speech.period.noon');
    if (hour < 19) return this.i18n.t('speech.period.afternoon');
    return this.i18n.t('speech.period.night');
  }

  /** Cuts off whatever is being read aloud; the pending `speak()` resolves. */
  stopSpeaking(): void {
    if (Capacitor.isNativePlatform()) {
      void TextToSpeech.stop().catch(() => undefined);
      return;
    }
    window.speechSynthesis?.cancel();
  }

  private async speakNative(text: string): Promise<void> {
    try {
      const voice = await this.findNativeVoice();
      await TextToSpeech.speak({
        text,
        lang: NATIVE_TTS_LANG,
        voice,
        rate: NATIVE_SPEECH_RATE,
        queueStrategy: QueueStrategy.Flush,
      });
    } catch {
      // The engine may lack es-US (e.g. Samsung's only has Mexican Spanish): retry with plain Spanish.
      try {
        await TextToSpeech.speak({ text, lang: 'es', rate: NATIVE_SPEECH_RATE, queueStrategy: QueueStrategy.Flush });
      } catch (error) {
        console.error('Text to speech failed', error);
      }
    }
  }

  /** Looked up once: the plugin picks voices by their position in the engine's list. */
  private findNativeVoice(): Promise<number | undefined> {
    this.nativeVoice ??= TextToSpeech.getSupportedVoices()
      .then(({ voices }) => {
        const index = voices.findIndex((v) => v.voiceURI === NATIVE_VOICE_NAME);
        return index >= 0 ? index : undefined;
      })
      .catch(() => undefined);
    return this.nativeVoice;
  }

  private speakWeb(text: string): Promise<void> {
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
