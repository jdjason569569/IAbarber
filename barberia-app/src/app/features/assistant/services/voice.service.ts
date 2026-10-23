import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { I18nService } from '../../../core/i18n/i18n.service';
import { VoiceError } from '../models/voice-error';

interface WebSpeechRecognition {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}

type WebSpeechRecognitionCtor = new () => WebSpeechRecognition;

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly language = inject(I18nService).speechLocale;
  private webRecognition: WebSpeechRecognition | null = null;

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
    // The plugin rejects with its own messages when nothing is heard; treat all of them as "no speech".
    const result = await SpeechRecognition.start({
      language: this.language,
      maxResults: 1,
      popup: false,
      partialResults: false,
    }).catch(() => null);
    const transcript = result?.matches?.[0];
    if (!transcript) {
      throw new VoiceError('no-speech');
    }
    return transcript;
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
        reject(new VoiceError(event.error === 'not-allowed' ? 'permission-denied' : 'no-speech'));
      recognition.start();
    });
  }
}
