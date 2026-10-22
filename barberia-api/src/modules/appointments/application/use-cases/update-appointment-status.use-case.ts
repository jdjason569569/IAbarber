import { Inject, Injectable } from '@nestjs/common';
import type { AppointmentStatus } from '../../domain/entities/appointment-status.js';
import { APPOINTMENT_STATUSES } from '../../domain/entities/appointment-status.js';
import { AppointmentConflictError } from '../../domain/errors/appointment-conflict.error.js';
import { AppointmentNotFoundError } from '../../domain/errors/appointment-not-found.error.js';
import { InvalidAppointmentError } from '../../domain/errors/invalid-appointment.error.js';
import { APPOINTMENT_REPOSITORY } from '../../domain/ports/appointment.repository.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';
import { toAppointmentDto } from '../dtos/appointment.dto.js';
import type { AppointmentDto } from '../dtos/appointment.dto.js';

@Injectable()
export class UpdateAppointmentStatusUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
  ) {}

  async execute(id: number, status: string): Promise<AppointmentDto> {
    if (!APPOINTMENT_STATUSES.includes(status as AppointmentStatus)) {
      throw new InvalidAppointmentError(`Invalid status: ${status}`);
    }
    const appointment = await this.appointments.findById(id);
    if (!appointment) {
      throw new AppointmentNotFoundError(`Appointment ${id} not found`);
    }
    const updated = appointment.withStatus(status as AppointmentStatus);
    // Reopening a cancelled appointment takes its slot again, so it must still be free.
    if (updated.isActive && !appointment.isActive) {
      const taken = await this.appointments.findActiveAt(updated.date, updated.time);
      if (taken && taken.id !== updated.id) {
        throw new AppointmentConflictError(`${updated.date} at ${updated.time} is already booked`);
      }
    }
    const saved = await this.appointments.save(updated);
    return toAppointmentDto(saved);
  }
}
