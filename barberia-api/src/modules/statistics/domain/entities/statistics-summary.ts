export type StatisticsTotalKey =
  | 'appointmentsThisMonth'
  | 'revenueThisMonth'
  | 'newClients'
  | 'cancellationRate';

/** `key` is a stable identifier; clients translate it to a label. */
export interface StatisticsTotal {
  key: StatisticsTotalKey;
  value: string;
}

/** One day of the history: services done (not cancelled, walk-ins included) and money earned. */
export interface DailyStatistic {
  /** `YYYY-MM-DD`. */
  date: string;
  appointments: number;
  /** Total of the completed appointments of the day (service + extras). */
  revenue: number;
}

/** Appointments that started at an hour of a weekday, over the whole history window. */
export interface WeekdayHourStatistic {
  /** 0 = Monday … 6 = Sunday. */
  weekday: number;
  /** 0–23. */
  hour: number;
  appointments: number;
}

export interface StatisticsSummary {
  totals: StatisticsTotal[];
  /** Days from `HISTORY_DAYS` ago to today that had appointments (days without any are omitted). */
  daily: DailyStatistic[];
  /** Only the weekday/hour cells that had appointments. */
  weekdayHour: WeekdayHourStatistic[];
}
