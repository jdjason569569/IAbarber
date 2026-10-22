export type StatisticsTotalKey =
  | 'appointmentsThisMonth'
  | 'revenueThisMonth'
  | 'newClients'
  | 'cancellationRate';

export interface StatisticsTotal {
  key: StatisticsTotalKey;
  value: string;
}

export interface TopService {
  name: string;
  count: number;
}

export interface Statistics {
  totals: StatisticsTotal[];
  topServices: TopService[];
}
