import { Inject, Injectable } from '@nestjs/common';
import { Appointment } from '../../domain/entities/appointment.entity.js';
import { APPOINTMENT_REPOSITORY } from '../../domain/ports/appointment.repository.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';
import { toAppointmentDto } from '../dtos/appointment.dto.js';
import type { AppointmentDto, ScheduleAppointmentInput } from '../dtos/appointment.dto.js';

/**
 * Saves in the current workspace a copy of a booking already accepted in another one (e.g. a
 * WhatsApp booking of the admin copied into the guest demo). The booking really happened, so the
 * hours and day blocks of this workspace are not checked; only an active booking at the exact same
 * date and time rejects it (AppointmentConflictError from the repository).
 */
@Injectable()
export class CopyAppointmentUseCase {
  constructor(@Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository) {}

  async execute(input: ScheduleAppointmentInput): Promise<AppointmentDto> {
    const saved = await this.appointments.save(Appointment.create(input));
    return toAppointmentDto(saved);
  }
}
