import { Inject, Injectable } from '@nestjs/common';
import { SaveDayBlocksUseCase } from '../../../business-hours/application/use-cases/save-day-blocks.use-case.js';
import { DayBlocks } from '../../../business-hours/domain/entities/day-blocks.entity.js';
import type { TimeBlock } from '../../../business-hours/domain/entities/day-blocks.entity.js';
import { BlocksClashWithAppointmentsError } from '../../domain/errors/blocks-clash-with-appointments.error.js';
import { APPOINTMENT_REPOSITORY } from '../../domain/ports/appointment.repository.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';
import { toAppointmentDto } from '../dtos/appointment.dto.js';

/** Stores the hours the barber is not available on a date, unless an active appointment is inside them. */
@Injectable()
export class UpdateDayBlocksUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    private readonly saveDayBlocks: SaveDayBlocksUseCase,
  ) {}

  async execute(date: string, blocks: TimeBlock[]): Promise<TimeBlock[]> {
    const day = DayBlocks.create(date, blocks);
    const clashing = (await this.appointments.findAll()).filter(
      (a) => a.isActive && a.date === date && day.covering(a.time) !== undefined,
    );
    if (clashing.length > 0) {
      throw new BlocksClashWithAppointmentsError(clashing.map(toAppointmentDto));
    }
    return this.saveDayBlocks.execute(day);
  }
}
