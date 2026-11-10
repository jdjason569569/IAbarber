export type StatisticsTotalKey =
  | 'appointmentsThisMonth'
  | 'revenueThisMonth'
  | 'newClients'
  | 'cancellationRate';

export interface StatisticsTotal {
  key: StatisticsTotalKey;
  value: string;
}

/** One day of the history: services done (walk-ins included) and money of the completed ones. */
export interface DailyStatistic {
  /** `YYYY-MM-DD`. */
  date: string;
  appointments: number;
  revenue: number;
}

/** Appointments at an hour of a weekday over the history window. */
export interface WeekdayHourStatistic {
  /** 0 = Monday … 6 = Sunday. */
  weekday: number;
  /** 0–23. */
  hour: number;
  appointments: number;
}

export interface Statistics {
  totals: StatisticsTotal[];
  /** Only the days that had appointments, oldest first. */
  daily: DailyStatistic[];
  /** Only the weekday/hour cells that had appointments. */
  weekdayHour: WeekdayHourStatistic[];
}
