import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

/** `{{ 20000 | pesos }}` → "$20.000 COP". */
@Pipe({ name: 'pesos' })
export class PesosPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: number): string {
    return this.i18n.money(value);
  }
}
