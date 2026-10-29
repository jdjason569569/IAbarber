import { Inject, Injectable } from '@nestjs/common';
import { GetBusinessHoursUseCase } from '../../../business-hours/application/use-cases/get-business-hours.use-case.js';
import { GetDayBlocksUseCase } from '../../../business-hours/application/use-cases/get-day-blocks.use-case.js';
import { Appointment } from '../../domain/entities/appointment.entity.js';
import { AppointmentConflictError } from '../../domain/errors/appointment-conflict.error.js';
import { AppointmentInPastError } from '../../domain/errors/appointment-in-past.error.js';
import { BarberUnavailableError } from '../../domain/errors/barber-unavailable.error.js';
import { OutsideBusinessHoursError } from '../../domain/errors/outside-business-hours.error.js';
import { APPOINTMENT_REPOSITORY } from '../../domain/ports/appointment.repository.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';
import { toAppointmentDto } from '../dtos/appointment.dto.js';
import type { AppointmentDto, ScheduleAppointmentInput } from '../dtos/appointment.dto.js';

@Injectable()
export class ScheduleAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    private readonly businessHours: GetBusinessHoursUseCase,
    private readonly dayBlocks: GetDayBlocksUseCase,
  ) {}

  async execute(input: ScheduleAppointmentInput): Promise<AppointmentDto> {
    const appointment = Appointment.create(input);
    if (new Date(`${appointment.date}T${appointment.time}:00`).getTime() <= Date.now()) {
      throw new AppointmentInPastError('The appointment must be in the future');
    }
    const hours = await this.businessHours.execute();
    if (!hours.allows(appointment.date, appointment.time)) {
      throw new OutsideBusinessHoursError(
        `The shop is closed on ${appointment.date} at ${appointment.time}`,
      );
    }
    if ((await this.dayBlocks.execute(appointment.date)).covering(appointment.time)) {
      throw new BarberUnavailableError(
        `The barber is not available on ${appointment.date} at ${appointment.time}`,
      );
    }
    // Moved appointments can start at :30, so a slot is taken by any booking less than an hour away.
    if ((await this.appointments.findAll()).some((a) => a.clashesWith(appointment))) {
      throw new AppointmentConflictError(
        `${appointment.date} at ${appointment.time} is already booked`,
      );
    }
    const saved = await this.appointments.save(appointment);
    return toAppointmentDto(saved);
  }
}
