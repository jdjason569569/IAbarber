import type { EChartsCoreOption } from 'echarts/core';
import { parseIsoDate, toLocalIsoDate } from '../../../shared/utils/date.util';
import type { DailyStatistic, WeekdayHourStatistic } from '../models/statistics.model';

/** Days in the calendar heatmap (the API sends the same window). */
export const HISTORY_DAYS = 120;
/** Days in the revenue bar chart. */
export const REVENUE_DAYS = 30;

/**
 * Colors of the app's always-dark, black-and-gold theme (theme/variables.scss). The gold ramp is one
 * hue from dark to light (more = lighter) and was validated as an ordinal ramp on the card surface.
 */
const COLORS = {
  surface: '#1e1b18',
  empty: '#2a2621',
  text: '#f3ede4',
  muted: '#a39b8f',
  grid: '#2e2a25',
  tooltip: '#17140f',
  border: 'rgba(212, 162, 76, 0.35)',
  bar: '#d4a24c',
  ramp: ['#6b5226', '#8f6a31', '#b8873c', '#d4a24c', '#f0c674'],
};

/** Texts and formatters the charts need; the page gives them from the i18n catalog. */
export interface ChartLabels {
  locale: string;
  less: string;
  more: string;
  cuts: (count: number) => string;
  cell: (weekday: string, hour: string) => string;
  money: (value: number) => string;
}

const tooltip = {
  backgroundColor: COLORS.tooltip,
  borderColor: COLORS.border,
  textStyle: { color: COLORS.text, fontSize: 12 },
  confine: true,
};

/** Continuous gold scale, shown as a small "Menos ▭ Más" key under the chart. */
function scale(max: number, labels: ChartLabels): object {
  return {
    min: 1,
    max: Math.max(max, 2),
    calculable: false,
    orient: 'horizontal',
    left: 'center',
    bottom: 0,
    itemWidth: 10,
    itemHeight: 90,
    text: [labels.more, labels.less],
    textStyle: { color: COLORS.muted, fontSize: 11 },
    inRange: { color: COLORS.ramp },
  };
}

/** Calendar heatmap: one square per day of the last HISTORY_DAYS; empty days stay dark. */
export function cutsByDayOption(daily: DailyStatistic[], labels: ChartLabels): EChartsCoreOption {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - (HISTORY_DAYS - 1));
  // ECharts wants Sunday first in nameMap, whatever `firstDay` is.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(labels.locale, { weekday: 'narrow' }).format(new Date(2026, 0, 4 + i)),
  );
  const months = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(labels.locale, { month: 'short' }).format(new Date(2026, i, 1)),
  );
  const dayFormat = new Intl.DateTimeFormat(labels.locale, { weekday: 'long', day: 'numeric', month: 'long' });
  return {
    tooltip: {
      ...tooltip,
      formatter: (p: { value: [string, number] }) =>
        `${dayFormat.format(parseIsoDate(p.value[0]))}<br/><b>${labels.cuts(p.value[1])}</b>`,
    },
    visualMap: scale(Math.max(0, ...daily.map((d) => d.appointments)), labels),
    calendar: {
      range: [toLocalIsoDate(from), toLocalIsoDate(today)],
      top: 22,
      left: 22,
      right: 6,
      cellSize: ['auto', 15],
      splitLine: { show: false },
      // 2px surface gap between squares.
      itemStyle: { color: COLORS.empty, borderColor: COLORS.surface, borderWidth: 2 },
      dayLabel: { firstDay: 1, nameMap: weekdays, color: COLORS.muted, fontSize: 10, margin: 6 },
      monthLabel: { nameMap: months, color: COLORS.muted, fontSize: 10, margin: 6 },
      yearLabel: { show: false },
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: daily.map((d) => [d.date, d.appointments]),
        itemStyle: { borderColor: COLORS.surface, borderWidth: 2, borderRadius: 2 },
      },
    ],
  };
}

/** Heatmap weekday × hour: which days and hours are busiest. */
export function cutsByHourOption(cells: WeekdayHourStatistic[], labels: ChartLabels): EChartsCoreOption {
  const hours = cells.map((c) => c.hour);
  const first = hours.length ? Math.min(...hours) : 8;
  const last = hours.length ? Math.max(...hours) : 20;
  const hourLabels = Array.from({ length: last - first + 1 }, (_, i) => `${first + i}h`);
  // 2026-01-05 was a Monday.
  const weekdayFormat = (style: 'short' | 'long') =>
    Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(labels.locale, { weekday: style }).format(new Date(2026, 0, 5 + i)),
    );
  const shortDays = weekdayFormat('short');
  const longDays = weekdayFormat('long');
  return {
    tooltip: {
      ...tooltip,
      formatter: (p: { value: [number, number, number] }) =>
        `${labels.cell(longDays[p.value[1]], `${first + p.value[0]}:00`)}<br/><b>${labels.cuts(p.value[2])}</b>`,
    },
    visualMap: scale(Math.max(0, ...cells.map((c) => c.appointments)), labels),
    grid: { top: 6, left: 40, right: 6, bottom: 58 },
    xAxis: {
      type: 'category',
      data: hourLabels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: COLORS.muted, fontSize: 10 },
      splitArea: { show: true, areaStyle: { color: [COLORS.empty] } },
    },
    yAxis: {
      type: 'category',
      data: shortDays,
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: COLORS.muted, fontSize: 10 },
    },
    series: [
      {
        type: 'heatmap',
        data: cells.map((c) => [c.hour - first, c.weekday, c.appointments]),
        itemStyle: { borderColor: COLORS.surface, borderWidth: 2, borderRadius: 2 },
        emphasis: { itemStyle: { borderColor: COLORS.text, borderWidth: 1 } },
      },
    ],
  };
}

/** Bars of the money earned on each of the last REVENUE_DAYS days (days without income show no bar). */
export function revenueOption(daily: DailyStatistic[], labels: ChartLabels): EChartsCoreOption {
  const byDate = new Map(daily.map((d) => [d.date, d.revenue]));
  const dates = Array.from({ length: REVENUE_DAYS }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (REVENUE_DAYS - 1 - i));
    return toLocalIsoDate(day);
  });
  const shortDate = new Intl.DateTimeFormat(labels.locale, { day: 'numeric', month: 'short' });
  const longDate = new Intl.DateTimeFormat(labels.locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const compact = new Intl.NumberFormat(labels.locale, { notation: 'compact', maximumFractionDigits: 1 });
  return {
    tooltip: {
      ...tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(212, 162, 76, 0.08)' } },
      formatter: (params: { dataIndex: number; value: number }[]) => {
        const p = params[0];
        return `${longDate.format(parseIsoDate(dates[p.dataIndex]))}<br/><b>${labels.money(p.value)}</b>`;
      },
    },
    grid: { top: 12, left: 44, right: 8, bottom: 24 },
    xAxis: {
      type: 'category',
      data: dates.map((d) => shortDate.format(parseIsoDate(d))),
      axisLine: { lineStyle: { color: COLORS.grid } },
      axisTick: { show: false },
      axisLabel: { color: COLORS.muted, fontSize: 10, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: COLORS.grid } },
      axisLabel: { color: COLORS.muted, fontSize: 10, formatter: (v: number) => `$${compact.format(v)}` },
    },
    series: [
      {
        type: 'bar',
        data: dates.map((d) => byDate.get(d) ?? 0),
        barMaxWidth: 12,
        barCategoryGap: '30%',
        itemStyle: { color: COLORS.bar, borderRadius: [4, 4, 0, 0] },
      },
    ],
  };
}
