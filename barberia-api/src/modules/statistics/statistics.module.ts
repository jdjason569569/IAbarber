import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { GetStatisticsUseCase } from './application/use-cases/get-statistics.use-case.js';
import { STATISTICS_REPOSITORY } from './domain/ports/statistics.repository.js';
import { StatisticsController } from './infrastructure/http/statistics.controller.js';
import { AppointmentStatisticsRepository } from './infrastructure/persistence/appointment-statistics.repository.js';

@Module({
  imports: [AppointmentsModule],
  controllers: [StatisticsController],
  providers: [
    GetStatisticsUseCase,
    { provide: STATISTICS_REPOSITORY, useClass: AppointmentStatisticsRepository },
  ],
})
export class StatisticsModule {}
