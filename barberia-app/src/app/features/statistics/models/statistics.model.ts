export type StatisticsTotalKey =
  | 'appointmentsThisMonth'
  | 'revenueThisMonth'
  | 'newClients'
  | 'cancellationRate';

export interface StatisticsTotal {
  key: StatisticsTotalKey;
  value: string;
}

export interface Statistics {
  totals: StatisticsTotal[];
}
