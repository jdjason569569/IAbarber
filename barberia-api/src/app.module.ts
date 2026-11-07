import { Module } from '@nestjs/common';
import { SupabaseModule } from './shared/supabase/supabase.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AssistantModule } from './modules/assistant/assistant.module.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { HaircutAdvisorModule } from './modules/haircut-advisor/haircut-advisor.module.js';
import { BusinessHoursModule } from './modules/business-hours/business-hours.module.js';
import { StatisticsModule } from './modules/statistics/statistics.module.js';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module.js';

@Module({
  imports: [
    SupabaseModule,
    AuthModule,
    AppointmentsModule,
    AssistantModule,
    BusinessHoursModule,
    HaircutAdvisorModule,
    StatisticsModule,
    WhatsappModule,
  ],
})
export class AppModule {}
