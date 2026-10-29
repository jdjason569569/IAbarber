import { Inject, Injectable } from '@nestjs/common';
import { AppointmentNotFoundError } from '../../domain/errors/appointment-not-found.error.js';
import { APPOINTMENT_REPOSITORY } from '../../domain/ports/appointment.repository.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';
import { toAppointmentDto } from '../dtos/appointment.dto.js';
import type { AppointmentDto, UpdateAppointmentInput } from '../dtos/appointment.dto.js';

/** Corrects the client name and the price of any appointment, walk-ins included. */
@Injectable()
export class UpdateAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
  ) {}

  async execute(id: number, input: UpdateAppointmentInput): Promise<AppointmentDto> {
    const appointment = await this.appointments.findById(id);
    if (!appointment) {
      throw new AppointmentNotFoundError(`Appointment ${id} not found`);
    }
    const updated = appointment.withDetails(input.client, input.serviceCost);
    return toAppointmentDto(await this.appointments.save(updated));
  }
}
