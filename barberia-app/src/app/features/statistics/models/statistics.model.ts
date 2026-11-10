export type StatisticsTotalKey =
  | 'appointmentsThisMonth'
  | 'revenueThisMonth'
  | 'newClients'
  | 'cancellationRate';

export interface StatisticsTotal {
  key: StatisticsTotalKey;
  value: string;
}

/** One day of the history (only days with some activity are sent). */
export interface DailyStatistic {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Services done: appointments not cancelled, walk-ins included. */
  appointments: number;
  /** Money of the completed appointments. */
  revenue: number;
  /** Cancelled appointments (missing on older API versions). */
  cancelled?: number;
  /** Clients whose first appointment ever was this day (missing on older API versions). */
  newClients?: number;
}

/** Appointments (not cancelled) that started at an hour of a day. */
export interface HourlyStatistic {
  /** `YYYY-MM-DD`. */
  date: string;
  /** 0–23. */
  hour: number;
  appointments: number;
}

/** Response of `GET /statistics`. */
export interface Statistics {
  /** Totals of the calendar month, computed by the API (the page now computes its own per period). */
  totals: StatisticsTotal[];
  /** Days of the last four months with activity, oldest first. */
  daily: DailyStatistic[];
  /** Per day and hour, for any period (missing on older API versions). */
  hourly?: HourlyStatistic[];
}

/** Period chosen at the top of the statistics page. */
export type StatisticsPeriod = 'day' | 'week' | 'month';

/** Days each period covers, ending today. */
export const PERIOD_DAYS: Record<StatisticsPeriod, number> = { day: 1, week: 7, month: 30 };

/** The four numbers at the top, for the chosen period. */
export interface PeriodTotals {
  cuts: number;
  revenue: number;
  newClients: number;
  /** 0–100. */
  cancellationRate: number;
}
