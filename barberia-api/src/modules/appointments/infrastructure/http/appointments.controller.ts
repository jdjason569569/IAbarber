import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ListAppointmentsUseCase } from '../../application/use-cases/list-appointments.use-case.js';
import { ScheduleAppointmentUseCase } from '../../application/use-cases/schedule-appointment.use-case.js';
import { UpdateAppointmentStatusUseCase } from '../../application/use-cases/update-appointment-status.use-case.js';
import { AppointmentConflictError } from '../../domain/errors/appointment-conflict.error.js';
import { AppointmentNotFoundError } from '../../domain/errors/appointment-not-found.error.js';
import { InvalidAppointmentError } from '../../domain/errors/invalid-appointment.error.js';
import type { ScheduleAppointmentRequest, UpdateStatusRequest } from './schedule-appointment.request.js';

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly scheduleAppointment: ScheduleAppointmentUseCase,
    private readonly updateStatus: UpdateAppointmentStatusUseCase,
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
        date: String(body?.date ?? ''),
        time: String(body?.time ?? ''),
        serviceCost: Number(body?.serviceCost ?? 0),
        extras: Array.isArray(body?.extras)
          ? body.extras.map((e) => ({ name: String(e.name), price: Number(e.price) }))
          : [],
      });
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  @Patch(':id/status')
  async changeStatus(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateStatusRequest) {
    try {
      return await this.updateStatus.execute(id, String(body?.status ?? ''));
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  private toHttpError(error: unknown): unknown {
    if (error instanceof InvalidAppointmentError) return new BadRequestException(error.message);
    if (error instanceof AppointmentConflictError) return new ConflictException(error.message);
    if (error instanceof AppointmentNotFoundError) return new NotFoundException(error.message);
    return error;
  }
}
