import { Inject, Injectable } from '@nestjs/common';
import { AppointmentNotFoundError } from '../../domain/errors/appointment-not-found.error.js';
import { APPOINTMENT_REPOSITORY } from '../../domain/ports/appointment.repository.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';
import { toAppointmentDto } from '../dtos/appointment.dto.js';
import type { AppointmentDto } from '../dtos/appointment.dto.js';

/** Marks (true) or unmarks (false) that the service of an appointment was done. */
@Injectable()
export class SetAppointmentCompletedUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
  ) {}

  async execute(id: number, completed: boolean): Promise<AppointmentDto> {
    const appointment = await this.appointments.findById(id);
    if (!appointment) {
      throw new AppointmentNotFoundError(`Appointment ${id} not found`);
    }
    if (appointment.completed === completed) {
      return toAppointmentDto(appointment);
    }
    return toAppointmentDto(await this.appointments.save(appointment.withCompleted(completed)));
  }
}
