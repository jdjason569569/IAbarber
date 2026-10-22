import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService, MessageParams } from '../../core/i18n/i18n.service';
import { MessageKey } from '../../core/i18n/messages.es';

/** `{{ 'tabs.settings' | t }}` or `{{ 'statistics.appointmentsCount' | t: { count: 3 } }}`. */
@Pipe({ name: 't' })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: MessageKey, params?: MessageParams): string {
    return this.i18n.t(key, params);
  }
}
