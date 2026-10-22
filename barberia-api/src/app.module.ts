import { Module } from '@nestjs/common';
import { AssistantModule } from './modules/assistant/assistant.module.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { StatisticsModule } from './modules/statistics/statistics.module.js';

@Module({
  imports: [AppointmentsModule, AssistantModule, ServicesModule, StatisticsModule],
})
export class AppModule {}
