import type { EChartsCoreOption } from 'echarts/core';
import { parseIsoDate, toLocalIsoDate } from '../../../shared/utils/date.util';
import type { DailyStatistic, HourlyStatistic, PeriodTotals } from '../models/statistics.model';

/** Hours listed in "¿A qué hora llega más gente?". */
const TOP_HOURS = 6;

/**
 * Made for barbers, not analysts: one color carries meaning (gold = the best / above average,
 * gray = the rest) and every bar has its number written on it. Colors follow theme/variables.scss.
 */
const COLORS = {
  best: '#d4a24c',
  rest: '#6f675c',
  text: '#f3ede4',
  muted: '#a39b8f',
  grid: '#2e2a25',
  tooltip: '#17140f',
  border: 'rgba(212, 162, 76, 0.35)',
};

/** Texts and formatters the charts need; the page gives them from the i18n catalog. */
export interface ChartLabels {
  locale: string;
  /** `16` -> "4:00 p. m.". */
  hour: (hour: number) => string;
  money: (value: number) => string;
  cuts: (count: number) => string;
}

/** A plain-language fact shown above the charts ("Tu día más fuerte es el sábado"). */
export interface Insight {
  icon: string;
  title: string;
  detail: string;
}

/** Monday-first weekday names in the app's language. 2026-01-05 was a Monday. */
export function weekdayNames(locale: string, style: 'short' | 'long'): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: style }).format(new Date(2026, 0, 5 + i)),
  );
}

/** First date (`YYYY-MM-DD`) of a period of `days` days ending today. */
function periodStart(days: number): string {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return toLocalIsoDate(start);
}

/** Every day of the period, oldest first, with zeros for days without activity. */
export function periodDays(daily: DailyStatistic[], days: number): DailyStatistic[] {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  return Array.from({ length: days }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (days - 1 - i));
    const date = toLocalIsoDate(day);
    return byDate.get(date) ?? { date, appointments: 0, revenue: 0, cancelled: 0, newClients: 0 };
  });
}

/** Hour slots inside the period. */
export function periodHourly(hourly: HourlyStatistic[], days: number): HourlyStatistic[] {
  const from = periodStart(days);
  const today = toLocalIsoDate(new Date());
  return hourly.filter((h) => h.date >= from && h.date <= today);
}

/** The four numbers at the top of the page for the period. */
export function periodTotals(days: DailyStatistic[]): PeriodTotals {
  const cuts = days.reduce((acc, d) => acc + d.appointments, 0);
  const cancelled = days.reduce((acc, d) => acc + (d.cancelled ?? 0), 0);
  return {
    cuts,
    revenue: days.reduce((acc, d) => acc + d.revenue, 0),
    newClients: days.reduce((acc, d) => acc + (d.newClients ?? 0), 0),
    cancellationRate: cuts + cancelled ? Math.round((cancelled / (cuts + cancelled)) * 100) : 0,
  };
}

/** Cuts per weekday (0 = Monday). */
export function cutsPerWeekday(hourly: HourlyStatistic[]): number[] {
  const totals = Array<number>(7).fill(0);
  for (const h of hourly) totals[(parseIsoDate(h.date).getDay() + 6) % 7] += h.appointments;
  return totals;
}

/** Hours with the most cuts, busiest first. */
export function busiestHours(hourly: HourlyStatistic[]): { hour: number; cuts: number }[] {
  const totals = new Map<number, number>();
  for (const h of hourly) totals.set(h.hour, (totals.get(h.hour) ?? 0) + h.appointments);
  return [...totals.entries()]
    .map(([hour, cuts]) => ({ hour, cuts }))
    .sort((a, b) => b.cuts - a.cuts || a.hour - b.hour)
    .slice(0, TOP_HOURS);
}

/** Average money of the days that had appointments (an empty day would pull it down unfairly). */
export function averageRevenue(days: DailyStatistic[]): number {
  const worked = days.filter((d) => d.appointments > 0);
  return worked.length ? worked.reduce((acc, d) => acc + d.revenue, 0) / worked.length : 0;
}

/** Bars of cuts per weekday; the busiest day in gold with its number on top. */
export function weekdayOption(hourly: HourlyStatistic[], labels: ChartLabels): EChartsCoreOption {
  const totals = cutsPerWeekday(hourly);
  const best = Math.max(...totals);
  const shortDays = weekdayNames(labels.locale, 'short');
  const longDays = weekdayNames(labels.locale, 'long');
  return {
    tooltip: tooltip((i, value) => `${capitalize(longDays[i])}<br/><b>${labels.cuts(value)}</b>`),
    grid: { top: 24, left: 4, right: 4, bottom: 4, containLabel: true },
    xAxis: categoryAxis(shortDays.map(capitalize)),
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'bar',
        data: totals.map((value) => ({ value, itemStyle: { color: value === best && best > 0 ? COLORS.best : COLORS.rest } })),
        barMaxWidth: 28,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', color: COLORS.text, fontSize: 13, fontWeight: 'bold' },
      },
    ],
  };
}

/** Lying bars of the busiest hours, busiest on top and in gold, with the count at the end. */
export function hoursOption(hourly: HourlyStatistic[], labels: ChartLabels): EChartsCoreOption {
  const hours = busiestHours(hourly);
  return {
    tooltip: tooltip((i, value) => `${labels.hour(hours[i].hour)}<br/><b>${labels.cuts(value)}</b>`),
    grid: { top: 4, left: 4, right: 36, bottom: 4, containLabel: true },
    xAxis: { type: 'value', show: false },
    yAxis: { ...categoryAxis(hours.map((h) => labels.hour(h.hour))), inverse: true },
    series: [
      {
        type: 'bar',
        data: hours.map((h, i) => ({ value: h.cuts, itemStyle: { color: i === 0 ? COLORS.best : COLORS.rest } })),
        barMaxWidth: 22,
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', color: COLORS.text, fontSize: 13, fontWeight: 'bold' },
      },
    ],
  };
}

/** Money per day of the period: gold above the average, gray below, and the average as a line. */
export function revenueOption(days: DailyStatistic[], labels: ChartLabels): EChartsCoreOption {
  const average = averageRevenue(days);
  const shortDate = new Intl.DateTimeFormat(labels.locale, { day: 'numeric', month: 'short' });
  const longDate = new Intl.DateTimeFormat(labels.locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const compact = new Intl.NumberFormat(labels.locale, { notation: 'compact', maximumFractionDigits: 1 });
  return {
    tooltip: tooltip(
      (i, value) => `${capitalize(longDate.format(parseIsoDate(days[i].date)))}<br/><b>${labels.money(value)}</b>`,
    ),
    grid: { top: 8, left: 4, right: 8, bottom: 4, containLabel: true },
    xAxis: { ...categoryAxis(days.map((d) => shortDate.format(parseIsoDate(d.date)))), axisLabel: { color: COLORS.muted, fontSize: 10, hideOverlap: true } },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: COLORS.grid } },
      axisLabel: { color: COLORS.muted, fontSize: 10, formatter: (v: number) => `$${compact.format(v)}` },
    },
    series: [
      {
        type: 'bar',
        data: days.map((d) => ({
          value: d.revenue,
          itemStyle: { color: average > 0 && d.revenue >= average ? COLORS.best : COLORS.rest },
        })),
        barMaxWidth: 12,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        markLine: average > 0
          ? {
              symbol: 'none',
              silent: true,
              lineStyle: { color: COLORS.text, type: 'dashed', width: 1 },
              // The amount is written above the chart (the page), so it never covers the bars.
              label: { show: false },
              data: [{ yAxis: average }],
            }
          : undefined,
      },
    ],
  };
}

function categoryAxis(data: string[]): object {
  return {
    type: 'category',
    data,
    axisLine: { lineStyle: { color: COLORS.grid } },
    axisTick: { show: false },
    axisLabel: { color: COLORS.muted, fontSize: 12 },
  };
}

function tooltip(format: (index: number, value: number) => string): object {
  return {
    trigger: 'item',
    backgroundColor: COLORS.tooltip,
    borderColor: COLORS.border,
    textStyle: { color: COLORS.text, fontSize: 12 },
    confine: true,
    formatter: (p: { dataIndex: number; value: number }) => format(p.dataIndex, p.value),
  };
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}
