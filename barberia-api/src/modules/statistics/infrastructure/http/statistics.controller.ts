import { Controller, Get } from '@nestjs/common';
import { GetStatisticsUseCase } from '../../application/use-cases/get-statistics.use-case.js';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly getStatistics: GetStatisticsUseCase) {}

  @Get()
  get() {
    return this.getStatistics.execute();
  }
}
