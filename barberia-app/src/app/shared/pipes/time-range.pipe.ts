import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { formatTimeRange } from '../utils/time.util';

/** `{{ appointment.time | timeRange }}` -> "1:00 – 1:30 p. m.". */
@Pipe({ name: 'timeRange' })
export class TimeRangePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(time: string): string {
    return formatTimeRange(time, this.i18n.meridiemLabels());
  }
}
