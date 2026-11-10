import { Module } from '@nestjs/common';
import { SupabaseModule } from './shared/supabase/supabase.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AssistantModule } from './modules/assistant/assistant.module.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { HaircutAdvisorModule } from './modules/haircut-advisor/haircut-advisor.module.js';
import { BusinessHoursModule } from './modules/business-hours/business-hours.module.js';
import { StatisticsModule } from './modules/statistics/statistics.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ShopSettingsModule } from './modules/shop-settings/shop-settings.module.js';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module.js';

@Module({
  imports: [
    SupabaseModule,
    AuthModule,
    AppointmentsModule,
    AssistantModule,
    BusinessHoursModule,
    HaircutAdvisorModule,
    NotificationsModule,
    ShopSettingsModule,
    StatisticsModule,
    WhatsappModule,
  ],
})
export class AppModule {}
