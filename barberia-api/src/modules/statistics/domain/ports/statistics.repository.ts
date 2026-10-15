import type { StatisticsSummary } from '../entities/statistics-summary.js';

export const STATISTICS_REPOSITORY = Symbol('STATISTICS_REPOSITORY');

export interface StatisticsRepository {
  getSummary(): Promise<StatisticsSummary>;
}
