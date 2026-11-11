import { Inject, Injectable } from '@nestjs/common';
import { GetDayBlocksUseCase } from '../../../business-hours/application/use-cases/get-day-blocks.use-case.js';
import { AppointmentConflictError } from '../../domain/errors/appointment-conflict.error.js';
import { AppointmentNotFoundError } from '../../domain/errors/appointment-not-found.error.js';
import { BarberUnavailableError } from '../../domain/errors/barber-unavailable.error.js';
import { APPOINTMENT_REPOSITORY } from '../../domain/ports/appointment.repository.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';
import { toAppointmentDto } from '../dtos/appointment.dto.js';
import type { AppointmentDto } from '../dtos/appointment.dto.js';

/**
 * Moves a pending booking to another date and time, keeping the same record (and counting the move).
 * The new slot must not be blocked by the barber nor taken by another booking.
 */
@Injectable()
export class RescheduleAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    private readonly dayBlocks: GetDayBlocksUseCase,
  ) {}

  async execute(id: number, date: string, time: string): Promise<AppointmentDto> {
    const appointment = await this.appointments.findById(id);
    if (!appointment) {
      throw new AppointmentNotFoundError(`Appointment ${id} not found`);
    }
    const moved = appointment.rescheduledTo(date, time);
    if ((await this.dayBlocks.execute(date)).covering(time)) {
      throw new BarberUnavailableError(`The barber is not available on ${date} at ${time}`);
    }
    const all = await this.appointments.findAll();
    if (all.some((a) => a.id !== moved.id && a.clashesWith(moved))) {
      throw new AppointmentConflictError(`${date} at ${time} is already booked`);
    }
    return toAppointmentDto(await this.appointments.save(moved));
  }
}
