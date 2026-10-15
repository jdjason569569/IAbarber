import { Module } from '@nestjs/common';
import { GetStatisticsUseCase } from './application/use-cases/get-statistics.use-case.js';
import { STATISTICS_REPOSITORY } from './domain/ports/statistics.repository.js';
import { StatisticsController } from './infrastructure/http/statistics.controller.js';
import { InMemoryStatisticsRepository } from './infrastructure/persistence/in-memory-statistics.repository.js';

@Module({
  controllers: [StatisticsController],
  providers: [
    GetStatisticsUseCase,
    { provide: STATISTICS_REPOSITORY, useClass: InMemoryStatisticsRepository },
  ],
})
export class StatisticsModule {}
