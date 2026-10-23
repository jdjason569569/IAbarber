import { Inject, Injectable } from '@nestjs/common';
import { AppointmentConflictError } from '../../domain/errors/appointment-conflict.error.js';
import { AppointmentNotFoundError } from '../../domain/errors/appointment-not-found.error.js';
import { APPOINTMENT_REPOSITORY } from '../../domain/ports/appointment.repository.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';
import { toAppointmentDto } from '../dtos/appointment.dto.js';
import type { AppointmentDto } from '../dtos/appointment.dto.js';

/** Cancels (true) or reactivates (false) an appointment. The record is never deleted. */
@Injectable()
export class SetAppointmentCancelledUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
  ) {}

  async execute(id: number, cancelled: boolean): Promise<AppointmentDto> {
    const appointment = await this.appointments.findById(id);
    if (!appointment) {
      throw new AppointmentNotFoundError(`Appointment ${id} not found`);
    }
    if (appointment.cancelled === cancelled) {
      return toAppointmentDto(appointment);
    }
    const updated = appointment.withCancelled(cancelled);
    // Reactivating takes the slot again, so it must still be free.
    if (updated.isActive) {
      const taken = await this.appointments.findActiveAt(updated.date, updated.time);
      if (taken && taken.id !== updated.id) {
        throw new AppointmentConflictError(`${updated.date} at ${updated.time} is already booked`);
      }
    }
    return toAppointmentDto(await this.appointments.save(updated));
  }
}
