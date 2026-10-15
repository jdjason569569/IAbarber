import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { ListAppointmentsUseCase } from '../../application/use-cases/list-appointments.use-case.js';
import { ScheduleAppointmentUseCase } from '../../application/use-cases/schedule-appointment.use-case.js';
import { InvalidAppointmentError } from '../../domain/errors/invalid-appointment.error.js';
import type { ScheduleAppointmentRequest } from './schedule-appointment.request.js';

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly scheduleAppointment: ScheduleAppointmentUseCase,
  ) {}

  @Get()
  list() {
    return this.listAppointments.execute();
  }

  @Post()
  async schedule(@Body() body: ScheduleAppointmentRequest) {
    try {
      return await this.scheduleAppointment.execute({
        client: String(body?.client ?? ''),
        service: String(body?.service ?? ''),
        barber: String(body?.barber ?? ''),
        date: String(body?.date ?? ''),
        time: String(body?.time ?? ''),
      });
    } catch (error) {
      if (error instanceof InvalidAppointmentError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
