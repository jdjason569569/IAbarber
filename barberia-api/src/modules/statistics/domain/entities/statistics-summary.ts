export interface StatisticsTotal {
  label: string;
  value: string;
}

export interface TopService {
  name: string;
  count: number;
}

export interface BarberSummary {
  name: string;
  appointments: number;
  revenue: string;
}

export interface StatisticsSummary {
  totals: StatisticsTotal[];
  topServices: TopService[];
  barbers: BarberSummary[];
}
