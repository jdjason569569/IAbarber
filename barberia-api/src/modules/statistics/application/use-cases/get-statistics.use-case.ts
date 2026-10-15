import { Inject, Injectable } from '@nestjs/common';
import type { StatisticsSummary } from '../../domain/entities/statistics-summary.js';
import { STATISTICS_REPOSITORY } from '../../domain/ports/statistics.repository.js';
import type { StatisticsRepository } from '../../domain/ports/statistics.repository.js';

@Injectable()
export class GetStatisticsUseCase {
  constructor(
    @Inject(STATISTICS_REPOSITORY) private readonly statistics: StatisticsRepository,
  ) {}

  execute(): Promise<StatisticsSummary> {
    return this.statistics.getSummary();
  }
}
