import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { MessageKey } from '../../../core/i18n/messages.es';
import { ChartComponent } from '../../../shared/components/chart/chart.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { parseIsoDate } from '../../../shared/utils/date.util';
import { formatTime12 } from '../../../shared/utils/time.util';
import { PERIOD_DAYS } from '../models/statistics.model';
import type { DailyStatistic, HourlyStatistic, Statistics, StatisticsPeriod } from '../models/statistics.model';
import { StatisticsService } from '../services/statistics.service';
import {
  averageRevenue,
  busiestHours,
  cutsPerWeekday,
  hoursOption,
  periodDays,
  periodHourly,
  periodTotals,
  revenueOption,
  weekdayNames,
  weekdayOption,
} from '../utils/statistics-charts';
import type { ChartLabels, Insight } from '../utils/statistics-charts';

/** The four boxes at the top, in order. */
interface TotalBox {
  label: MessageKey;
  value: string;
}

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
  /** Hoy / Semana / Mes: every number, phrase and chart below is computed for it. */
  protected readonly period = signal<StatisticsPeriod>('month');

  private readonly labels: ChartLabels = {
    locale: this.i18n.locale,
    hour: (hour) => formatTime12(`${hour}:00`, this.i18n.meridiemLabels()),
    money: (value) => `$${value.toLocaleString(this.i18n.locale, { maximumFractionDigits: 0 })}`,
    cuts: (count) =>
      count === 1 ? this.i18n.t('statistics.charts.oneCut') : this.i18n.t('statistics.charts.cuts', { count }),
  };

  /** Every day of the chosen period (zeros included). */
  private readonly days = computed((): DailyStatistic[] =>
    periodDays(this.stats()?.daily ?? [], PERIOD_DAYS[this.period()]),
  );
  private readonly hourly = computed((): HourlyStatistic[] =>
    periodHourly(this.stats()?.hourly ?? [], PERIOD_DAYS[this.period()]),
  );

  protected readonly totals = computed((): TotalBox[] => {
    const t = periodTotals(this.days());
    return [
      { label: 'statistics.totals.cuts', value: String(t.cuts) },
      { label: 'statistics.totals.revenue', value: this.labels.money(t.revenue) },
      { label: 'statistics.totals.newClients', value: String(t.newClients) },
      { label: 'statistics.totals.cancellations', value: `${t.cancellationRate}%` },
    ];
  });

  protected readonly hasCuts = computed(() => this.days().some((d) => d.appointments > 0));
  /** Comparing days only makes sense over several days. */
  protected readonly severalDays = computed(() => this.period() !== 'day');
  protected readonly weekdayChart = computed(() => weekdayOption(this.hourly(), this.labels));
  protected readonly hoursChart = computed(() => hoursOption(this.hourly(), this.labels));
  protected readonly revenueChart = computed(() => revenueOption(this.days(), this.labels));
  /** "Promedio por día: $147.593", written over the chart next to a dashed sample of its line. */
  protected readonly averageText = computed(() => {
    const average = averageRevenue(this.days());
    return average > 0 ? this.i18n.t('statistics.charts.average', { amount: this.labels.money(Math.round(average)) }) : '';
  });
  /** The answers in plain words, so the barber does not have to read the charts. */
  protected readonly insights = computed(() => this.buildInsights());

  protected readonly emptyKey = computed(
    (): MessageKey => `statistics.empty.${this.period()}` satisfies MessageKey,
  );

  /** Ionic hook: reload every time the tab is shown so new appointments are counted. */
  ionViewWillEnter(): void {
    this.load();
  }

  protected choosePeriod(value: unknown): void {
    if (value === 'day' || value === 'week' || value === 'month') this.period.set(value);
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.stats.set(null);
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

  private buildInsights(): Insight[] {
    const say = (key: MessageKey, params?: Record<string, string>) => this.i18n.t(key, params);
    const days = this.days();
    const hourly = this.hourly();
    const insights: Insight[] = [];

    if (this.severalDays()) {
      const perWeekday = cutsPerWeekday(hourly);
      const best = perWeekday.indexOf(Math.max(...perWeekday));
      if (perWeekday[best] > 0) {
        insights.push({
          icon: '🔥',
          title: say('statistics.insights.bestWeekday', { weekday: weekdayNames(this.i18n.locale, 'long')[best] }),
          detail: this.labels.cuts(perWeekday[best]),
        });
      }
    }

    const [topHour] = busiestHours(hourly);
    if (topHour) {
      insights.push({
        icon: '⏰',
        title: say('statistics.insights.busiestHour', { hour: this.labels.hour(topHour.hour) }),
        detail: this.labels.cuts(topHour.cuts),
      });
    }

    const earned = days.reduce((acc, d) => acc + d.revenue, 0);
    if (earned > 0) {
      insights.push({
        icon: '💰',
        title: say(`statistics.insights.revenue.${this.period()}` satisfies MessageKey, { amount: this.labels.money(earned) }),
        detail: this.severalDays()
          ? say('statistics.insights.revenueDetail', { average: this.labels.money(Math.round(averageRevenue(days))) })
          : this.labels.cuts(days.reduce((acc, d) => acc + d.appointments, 0)),
      });
    }

    if (this.severalDays()) {
      // Best day by money; while nothing is completed yet, by number of cuts.
      const top = [...days].sort((a, b) => b.revenue - a.revenue || b.appointments - a.appointments)[0];
      if (top && top.appointments > 0) {
        const date = new Intl.DateTimeFormat(this.i18n.locale, { weekday: 'long', day: 'numeric', month: 'long' })
          .format(parseIsoDate(top.date));
        insights.push({
          icon: '🏆',
          title: say('statistics.insights.bestDay', { date }),
          detail: top.revenue > 0
            ? say('statistics.insights.bestDayDetail', { cuts: this.labels.cuts(top.appointments), amount: this.labels.money(top.revenue) })
            : this.labels.cuts(top.appointments),
        });
      }
    }
    return insights;
  }
}
