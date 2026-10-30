import { Inject, Injectable } from '@nestjs/common';
import { GetDayBlocksUseCase } from '../../../business-hours/application/use-cases/get-day-blocks.use-case.js';
import { AppointmentConflictError } from '../../domain/errors/appointment-conflict.error.js';
import { AppointmentNotFoundError } from '../../domain/errors/appointment-not-found.error.js';
import { BarberUnavailableError } from '../../domain/errors/barber-unavailable.error.js';
import { APPOINTMENT_REPOSITORY } from '../../domain/ports/appointment.repository.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';
import { toAppointmentDto } from '../dtos/appointment.dto.js';
import type { AppointmentDto } from '../dtos/appointment.dto.js';

/** Marks (true) or unmarks (false) that the service of an appointment was done. */
@Injectable()
export class SetAppointmentCompletedUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    private readonly dayBlocks: GetDayBlocksUseCase,
  ) {}

  async execute(id: number, completed: boolean): Promise<AppointmentDto> {
    const appointment = await this.appointments.findById(id);
    if (!appointment) {
      throw new AppointmentNotFoundError(`Appointment ${id} not found`);
    }
    if (appointment.completed === completed) {
      return toAppointmentDto(appointment);
    }
    const updated = appointment.withCompleted(completed);
    // Completing frees the slot; unmarking takes it again, so it must still be free and not blocked.
    if (updated.holdsSlot) {
      if ((await this.dayBlocks.execute(updated.date)).covering(updated.time)) {
        throw new BarberUnavailableError(`The barber is not available on ${updated.date} at ${updated.time}`);
      }
      const all = await this.appointments.findAll();
      if (all.some((a) => a.id !== updated.id && a.clashesWith(updated))) {
        throw new AppointmentConflictError(`${updated.date} at ${updated.time} is already booked`);
      }
    }
    return toAppointmentDto(await this.appointments.save(updated));
  }
}
