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

export interface StatisticsSummary {
  totals: StatisticsTotal[];
}
