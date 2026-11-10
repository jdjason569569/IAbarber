import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { MessageKey } from '../../../core/i18n/messages.es';
import { Statistics, StatisticsTotalKey } from '../models/statistics.model';
import { StatisticsService } from '../services/statistics.service';

@Component({
  selector: 'app-statistics',
  templateUrl: 'statistics.page.html',
  styleUrls: ['statistics.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class StatisticsPage {
  private readonly statisticsService = inject(StatisticsService);
  private readonly i18n = inject(I18nService);

  protected readonly stats = signal<Statistics | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected totalLabel(key: StatisticsTotalKey): string {
    return this.i18n.t(`statistics.totals.${key}` satisfies MessageKey);
  }

  /** Ionic hook: reload every time the tab is shown so new appointments are counted. */
  ionViewWillEnter(): void {
    this.loading.set(true);
    this.error.set(null);
    this.statisticsService.getStatistics().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.i18n.t('statistics.loadError'));
        this.loading.set(false);
      },
    });
  }
}
