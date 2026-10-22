import { Inject, Injectable } from '@nestjs/common';
import { Appointment } from '../../domain/entities/appointment.entity.js';
import { AppointmentConflictError } from '../../domain/errors/appointment-conflict.error.js';
import { AppointmentInPastError } from '../../domain/errors/appointment-in-past.error.js';
import { APPOINTMENT_REPOSITORY } from '../../domain/ports/appointment.repository.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';
import { toAppointmentDto } from '../dtos/appointment.dto.js';
import type { AppointmentDto, ScheduleAppointmentInput } from '../dtos/appointment.dto.js';

@Injectable()
export class ScheduleAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
  ) {}

  async execute(input: ScheduleAppointmentInput): Promise<AppointmentDto> {
    const appointment = Appointment.create(input);
    if (new Date(`${appointment.date}T${appointment.time}:00`).getTime() <= Date.now()) {
      throw new AppointmentInPastError('The appointment must be in the future');
    }
    if (await this.appointments.findActiveAt(appointment.date, appointment.time)) {
      throw new AppointmentConflictError(
        `${appointment.date} at ${appointment.time} is already booked`,
      );
    }
    const saved = await this.appointments.save(appointment);
    return toAppointmentDto(saved);
  }
}
