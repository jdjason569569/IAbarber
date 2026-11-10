import { Module } from '@nestjs/common';
import { isSupabaseConfigured } from '../../shared/supabase/supabase.provider.js';
import { BusinessHoursModule } from '../business-hours/business-hours.module.js';
import { ListAppointmentsUseCase } from './application/use-cases/list-appointments.use-case.js';
import { ListAvailableSlotsUseCase } from './application/use-cases/list-available-slots.use-case.js';
import { RegisterWalkInUseCase } from './application/use-cases/register-walk-in.use-case.js';
import { ScheduleAppointmentUseCase } from './application/use-cases/schedule-appointment.use-case.js';
import { SetAppointmentCancelledUseCase } from './application/use-cases/set-appointment-cancelled.use-case.js';
import { SetAppointmentCompletedUseCase } from './application/use-cases/set-appointment-completed.use-case.js';
import { UpdateAppointmentUseCase } from './application/use-cases/update-appointment.use-case.js';
import { UpdateDayBlocksUseCase } from './application/use-cases/update-day-blocks.use-case.js';
import { APPOINTMENT_REPOSITORY } from './domain/ports/appointment.repository.js';
import { AppointmentsController } from './infrastructure/http/appointments.controller.js';
import { DayBlocksController } from './infrastructure/http/day-blocks.controller.js';
import { InMemoryAppointmentRepository } from './infrastructure/persistence/in-memory-appointment.repository.js';
import { SupabaseAppointmentRepository } from './infrastructure/persistence/supabase-appointment.repository.js';

// Uses Supabase when credentials are configured; falls back to memory for local development.
const useSupabase = isSupabaseConfigured;

@Module({
  imports: [BusinessHoursModule],
  controllers: [AppointmentsController, DayBlocksController],
  providers: [
    ListAppointmentsUseCase,
    ListAvailableSlotsUseCase,
    ScheduleAppointmentUseCase,
    RegisterWalkInUseCase,
    SetAppointmentCancelledUseCase,
    SetAppointmentCompletedUseCase,
    UpdateAppointmentUseCase,
    UpdateDayBlocksUseCase,
    {
      provide: APPOINTMENT_REPOSITORY,
      useClass: useSupabase ? SupabaseAppointmentRepository : InMemoryAppointmentRepository,
    },
  ],
  exports: [
    ListAppointmentsUseCase,
    ListAvailableSlotsUseCase,
    ScheduleAppointmentUseCase,
    RegisterWalkInUseCase,
    SetAppointmentCancelledUseCase,
  ],
})
export class AppointmentsModule {}
