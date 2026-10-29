import { Injectable } from '@angular/core';
import { MESSAGES_ES, MessageKey } from './messages.es';

export type MessageParams = Record<string, string | number>;

/** Looks up UI texts in the message catalog. Today the app is Spanish only. */
@Injectable({ providedIn: 'root' })
export class I18nService {
  /** Locale of the catalog; also used to format dates. */
  readonly locale = 'es-ES';

  /**
   * Locale for speech recognition and speech synthesis. Colombian Spanish: recognizers on Latin American
   * phones often lack es-ES; VoiceService falls back to the device language when this one fails.
   */
  readonly speechLocale = 'es-CO';

  private readonly messages: Record<MessageKey, string> = MESSAGES_ES;

  t(key: MessageKey, params?: MessageParams): string {
    const template = this.messages[key];
    if (!params) {
      return template;
    }
    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
      name in params ? String(params[name]) : placeholder,
    );
  }
}
