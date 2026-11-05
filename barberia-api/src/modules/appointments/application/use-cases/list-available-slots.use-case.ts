import { Inject, Injectable } from '@nestjs/common';
import { GetBusinessHoursUseCase } from '../../../business-hours/application/use-cases/get-business-hours.use-case.js';
import { GetDayBlocksUseCase } from '../../../business-hours/application/use-cases/get-day-blocks.use-case.js';
import { APPOINTMENT_MINUTES, Appointment, toTime } from '../../domain/entities/appointment.entity.js';
import { APPOINTMENT_REPOSITORY } from '../../domain/ports/appointment.repository.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';
import type { DaySlotsDto } from '../dtos/appointment.dto.js';

/** Half-hour start times a client could still book, with the same rules as scheduling. */
@Injectable()
export class ListAvailableSlotsUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    private readonly businessHours: GetBusinessHoursUseCase,
    private readonly dayBlocks: GetDayBlocksUseCase,
  ) {}

  /** `dates` are `YYYY-MM-DD`; the result keeps their order. */
  async execute(dates: string[]): Promise<DaySlotsDto[]> {
    const hours = await this.businessHours.execute();
    const booked = await this.appointments.findAll();
    const now = Date.now();
    const result: DaySlotsDto[] = [];
    for (const date of dates) {
      const day = hours.forDate(date);
      const blocks = await this.dayBlocks.execute(date);
      const times: string[] = [];
      for (
        let minutes = day.openHour * 60;
        day.open && minutes < day.closeHour * 60;
        minutes += APPOINTMENT_MINUTES
      ) {
        const time = toTime(minutes);
        if (new Date(`${date}T${time}:00`).getTime() <= now) continue;
        if (blocks.covering(time)) continue;
        // A candidate booking, so clashes follow the exact rule used when scheduling.
        const candidate = Appointment.create({ client: 'slot', date, time, serviceCost: 0, extras: [] });
        if (booked.some((a) => a.clashesWith(candidate))) continue;
        times.push(time);
      }
      result.push({ date, times });
    }
    return result;
  }
}
