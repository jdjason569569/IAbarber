import { Inject, Injectable } from '@nestjs/common';
import { Appointment } from '../../domain/entities/appointment.entity.js';
import { APPOINTMENT_REPOSITORY } from '../../domain/ports/appointment.repository.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';
import type { AppointmentDto, ScheduleAppointmentInput } from '../dtos/appointment.dto.js';

@Injectable()
export class ScheduleAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
  ) {}

  async execute(input: ScheduleAppointmentInput): Promise<AppointmentDto> {
    const appointment = Appointment.create({
      id: await this.appointments.nextId(),
      ...input,
    });
    await this.appointments.save(appointment);
    return {
      id: appointment.id,
      client: appointment.client,
      service: appointment.service,
      barber: appointment.barber,
      date: appointment.date,
      time: appointment.time,
      status: appointment.status,
    };
  }
}
