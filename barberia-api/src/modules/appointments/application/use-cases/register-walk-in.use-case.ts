import { Inject, Injectable } from '@nestjs/common';
import { GetBusinessHoursUseCase } from '../../../business-hours/application/use-cases/get-business-hours.use-case.js';
import { GetDayBlocksUseCase } from '../../../business-hours/application/use-cases/get-day-blocks.use-case.js';
import { localIsoDate } from '../../../../shared/utils/local-date.js';
import {
  APPOINTMENT_MINUTES,
  Appointment,
  toMinutes,
  toTime,
} from '../../domain/entities/appointment.entity.js';
import { AppointmentConflictError } from '../../domain/errors/appointment-conflict.error.js';
import { APPOINTMENT_REPOSITORY } from '../../domain/ports/appointment.repository.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';
import { toAppointmentDto } from '../dtos/appointment.dto.js';
import type { AppointmentDto, WalkInInput, WalkInResult } from '../dtos/appointment.dto.js';

/** Name stored for walk-in clients: the barber is never asked for it. */
export const WALK_IN_CLIENT = 'Cliente casual';

/** Minutes a walk-in takes; the bookings it overlaps, and every later one that day, move this much. */
export const WALK_IN_MINUTES = 30;

const MINUTES_PER_DAY = 24 * 60;

/**
 * Registers a client served right now without a booking, and pushes the rest of today's agenda
 * back WALK_IN_MINUTES, starting at the first booking the walk-in overlaps.
 */
@Injectable()
export class RegisterWalkInUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    private readonly businessHours: GetBusinessHoursUseCase,
    private readonly dayBlocks: GetDayBlocksUseCase,
  ) {}

  async execute(input: WalkInInput, now: Date = new Date()): Promise<WalkInResult> {
    const date = localIsoDate(now);
    const start = now.getHours() * 60 + now.getMinutes();
    const walkIn = Appointment.create({
      client: WALK_IN_CLIENT,
      service: input.service,
      date,
      time: toTime(start),
      serviceCost: input.serviceCost,
      extras: [],
      walkIn: true,
    });

    const today = (await this.appointments.findAll())
      .filter((a) => a.isActive && !a.walkIn && a.date === date)
      .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
    // First booking whose hour overlaps the walk-in: the late client, or the next one about to come.
    const first = today.findIndex((a) => {
      const from = toMinutes(a.time);
      return from < start + WALK_IN_MINUTES && from + APPOINTMENT_MINUTES > start;
    });
    const toMove = first < 0 ? [] : today.slice(first);

    const saved = await this.appointments.save(walkIn);

    const shifted: AppointmentDto[] = [];
    const notMoved: AppointmentDto[] = [];
    // Latest first, so each one moves into a time the next one already left.
    for (const appointment of [...toMove].reverse()) {
      const minutes = toMinutes(appointment.time) + WALK_IN_MINUTES;
      if (minutes >= MINUTES_PER_DAY) {
        notMoved.push(toAppointmentDto(appointment));
        continue;
      }
      try {
        shifted.push(toAppointmentDto(await this.appointments.save(appointment.withTime(toTime(minutes)))));
      } catch (error) {
        if (!(error instanceof AppointmentConflictError)) throw error;
        notMoved.push(toAppointmentDto(appointment));
      }
    }
    shifted.reverse();

    const hours = await this.businessHours.execute();
    const blocks = await this.dayBlocks.execute(date);
    const unavailable = shifted.filter((a) => !hours.allows(a.date, a.time) || blocks.covering(a.time));

    return { appointment: toAppointmentDto(saved), shifted, unavailable, notMoved };
  }
}
