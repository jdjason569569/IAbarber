import { Inject, Injectable } from '@nestjs/common';
import { APPOINTMENT_REPOSITORY } from '../../domain/ports/appointment.repository.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';
import type { AppointmentDto } from '../dtos/appointment.dto.js';

@Injectable()
export class ListAppointmentsUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
  ) {}

  async execute(): Promise<AppointmentDto[]> {
    const appointments = await this.appointments.findAll();
    return appointments.map((a) => ({
      id: a.id,
      client: a.client,
      service: a.service,
      barber: a.barber,
      date: a.date,
      time: a.time,
      status: a.status,
    }));
  }
}
