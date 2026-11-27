import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ShopSettingsModule } from '../shop-settings/shop-settings.module.js';
import { SendAppointmentRemindersUseCase } from './application/use-cases/send-appointment-reminders.use-case.js';
import { SENT_REMINDER_STORE } from './domain/ports/sent-reminder.store.js';
import { InMemorySentReminderStore } from './infrastructure/persistence/in-memory-sent-reminder.store.js';
import { AppointmentReminderScheduler } from './infrastructure/scheduling/appointment-reminder.scheduler.js';

// Pushes the 10- and 5-minute reminders to the barber's phone (see SendAppointmentRemindersUseCase).
@Module({
  imports: [AppointmentsModule, NotificationsModule, ShopSettingsModule],
  providers: [
    SendAppointmentRemindersUseCase,
    AppointmentReminderScheduler,
    { provide: SENT_REMINDER_STORE, useClass: InMemorySentReminderStore },
  ],
})
export class RemindersModule {}
