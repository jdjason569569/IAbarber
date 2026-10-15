import { Module } from '@nestjs/common';
import { ListAppointmentsUseCase } from './application/use-cases/list-appointments.use-case.js';
import { ScheduleAppointmentUseCase } from './application/use-cases/schedule-appointment.use-case.js';
import { APPOINTMENT_REPOSITORY } from './domain/ports/appointment.repository.js';
import { AppointmentsController } from './infrastructure/http/appointments.controller.js';
import { InMemoryAppointmentRepository } from './infrastructure/persistence/in-memory-appointment.repository.js';

@Module({
  controllers: [AppointmentsController],
  providers: [
    ListAppointmentsUseCase,
    ScheduleAppointmentUseCase,
    { provide: APPOINTMENT_REPOSITORY, useClass: InMemoryAppointmentRepository },
  ],
})
export class AppointmentsModule {}
