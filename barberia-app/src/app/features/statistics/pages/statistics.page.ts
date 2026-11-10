import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ChartComponent } from '../../../shared/components/chart/chart.component';
import { toLocalIsoDate } from '../../../shared/utils/date.util';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { MessageKey } from '../../../core/i18n/messages.es';
import { Statistics, StatisticsTotalKey } from '../models/statistics.model';
import { StatisticsService } from '../services/statistics.service';
import {
  REVENUE_DAYS,
  cutsByDayOption,
  cutsByHourOption,
  revenueOption,
} from '../utils/statistics-charts';
import type { ChartLabels } from '../utils/statistics-charts';

@Component({
  selector: 'app-statistics',
  templateUrl: 'statistics.page.html',
  styleUrls: ['statistics.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe, ChartComponent],
})
export class StatisticsPage {
  private readonly statisticsService = inject(StatisticsService);
  private readonly i18n = inject(I18nService);

  protected readonly stats = signal<Statistics | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly labels: ChartLabels = {
    locale: this.i18n.locale,
    less: this.i18n.t('statistics.charts.less'),
    more: this.i18n.t('statistics.charts.more'),
    cuts: (count) =>
      count === 1 ? this.i18n.t('statistics.charts.oneCut') : this.i18n.t('statistics.charts.cuts', { count }),
    cell: (weekday, hour) => this.i18n.t('statistics.charts.byHour.cell', { weekday, hour }),
    money: (value) => `$${value.toLocaleString(this.i18n.locale, { maximumFractionDigits: 0 })}`,
  };

  protected readonly hasHistory = computed(() => (this.stats()?.daily.length ?? 0) > 0);
  protected readonly cutsByDay = computed(() => cutsByDayOption(this.stats()?.daily ?? [], this.labels));
  protected readonly cutsByHour = computed(() => cutsByHourOption(this.stats()?.weekdayHour ?? [], this.labels));
  protected readonly revenue = computed(() => revenueOption(this.stats()?.daily ?? [], this.labels));
  /** Total of the revenue chart, said to screen readers since the bars are a canvas. */
  protected readonly revenueTotal = computed(() => {
    const since = new Date();
    since.setDate(since.getDate() - (REVENUE_DAYS - 1));
    const from = toLocalIsoDate(since);
    const total = (this.stats()?.daily ?? []).filter((d) => d.date >= from).reduce((acc, d) => acc + d.revenue, 0);
    return this.labels.money(total);
  });

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
