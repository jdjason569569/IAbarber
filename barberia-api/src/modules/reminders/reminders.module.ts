import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { BusinessHoursModule } from '../business-hours/business-hours.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ShopSettingsModule } from '../shop-settings/shop-settings.module.js';
import { SendOverdueAppointmentsAlertUseCase } from './application/use-cases/send-overdue-appointments-alert.use-case.js';
import { SendAppointmentRemindersUseCase } from './application/use-cases/send-appointment-reminders.use-case.js';
import { SENT_REMINDER_STORE } from './domain/ports/sent-reminder.store.js';
import { InMemorySentReminderStore } from './infrastructure/persistence/in-memory-sent-reminder.store.js';
import { AppointmentReminderScheduler } from './infrastructure/scheduling/appointment-reminder.scheduler.js';

// Pushes the 10- and 5-minute reminders to the barber's phone (see SendAppointmentRemindersUseCase), and
// the alerts about appointments that ended and are still active (SendOverdueAppointmentsAlertUseCase).
@Module({
  imports: [AppointmentsModule, BusinessHoursModule, NotificationsModule, ShopSettingsModule],
  providers: [
    SendAppointmentRemindersUseCase,
    SendOverdueAppointmentsAlertUseCase,
    AppointmentReminderScheduler,
    { provide: SENT_REMINDER_STORE, useClass: InMemorySentReminderStore },
  ],
})
export class RemindersModule {}
