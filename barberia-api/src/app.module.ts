import { Module } from '@nestjs/common';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { StatisticsModule } from './modules/statistics/statistics.module.js';

@Module({
  imports: [AppointmentsModule, StatisticsModule],
})
export class AppModule {}
