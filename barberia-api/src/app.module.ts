import { Module } from '@nestjs/common';
import { AssistantModule } from './modules/assistant/assistant.module.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { HaircutAdvisorModule } from './modules/haircut-advisor/haircut-advisor.module.js';
import { BusinessHoursModule } from './modules/business-hours/business-hours.module.js';
import { StatisticsModule } from './modules/statistics/statistics.module.js';

@Module({
  imports: [AppointmentsModule, AssistantModule, BusinessHoursModule, HaircutAdvisorModule, StatisticsModule],
})
export class AppModule {}
