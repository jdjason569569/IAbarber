import { Module } from '@nestjs/common';
import { supabaseProvider } from '../../shared/supabase/supabase.provider.js';
import { BusinessHoursModule } from '../business-hours/business-hours.module.js';
import { ListAppointmentsUseCase } from './application/use-cases/list-appointments.use-case.js';
import { ScheduleAppointmentUseCase } from './application/use-cases/schedule-appointment.use-case.js';
import { SetAppointmentCancelledUseCase } from './application/use-cases/set-appointment-cancelled.use-case.js';
import { APPOINTMENT_REPOSITORY } from './domain/ports/appointment.repository.js';
import { AppointmentsController } from './infrastructure/http/appointments.controller.js';
import { InMemoryAppointmentRepository } from './infrastructure/persistence/in-memory-appointment.repository.js';
import { SupabaseAppointmentRepository } from './infrastructure/persistence/supabase-appointment.repository.js';

// Uses Supabase when credentials are configured; falls back to memory for local development.
const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

@Module({
  imports: [BusinessHoursModule],
  controllers: [AppointmentsController],
  providers: [
    ListAppointmentsUseCase,
    ScheduleAppointmentUseCase,
    SetAppointmentCancelledUseCase,
    ...(useSupabase ? [supabaseProvider] : []),
    {
      provide: APPOINTMENT_REPOSITORY,
      useClass: useSupabase ? SupabaseAppointmentRepository : InMemoryAppointmentRepository,
    },
  ],
  exports: [ListAppointmentsUseCase, ScheduleAppointmentUseCase, SetAppointmentCancelledUseCase],
})
export class AppointmentsModule {}
