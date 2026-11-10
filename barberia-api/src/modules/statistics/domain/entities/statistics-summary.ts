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
  /** Appointments of the day that were cancelled. */
  cancelled: number;
  /** Clients whose first appointment ever was this day (walk-ins never count). */
  newClients: number;
}

/** Appointments (not cancelled) that started at an hour of a given day. */
export interface HourlyStatistic {
  /** `YYYY-MM-DD`. */
  date: string;
  /** 0–23. */
  hour: number;
  appointments: number;
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
  /** Same window, per day and hour, so the app can compute any period (today, week, month). */
  hourly: HourlyStatistic[];
  /** Only the weekday/hour cells that had appointments (kept for app versions before `hourly`). */
  weekdayHour: WeekdayHourStatistic[];
}
