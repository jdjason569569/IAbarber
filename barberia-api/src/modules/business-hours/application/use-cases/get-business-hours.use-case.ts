import { Inject, Injectable } from '@nestjs/common';
import { WeeklyHours } from '../../domain/entities/weekly-hours.entity.js';
import { BUSINESS_HOURS_REPOSITORY } from '../../domain/ports/business-hours.repository.js';
import type { BusinessHoursRepository } from '../../domain/ports/business-hours.repository.js';

@Injectable()
export class GetBusinessHoursUseCase {
  constructor(
    @Inject(BUSINESS_HOURS_REPOSITORY) private readonly hours: BusinessHoursRepository,
  ) {}

  /** The seven weekdays, with defaults filled in for the ones never configured. */
  async execute(): Promise<WeeklyHours> {
    return WeeklyHours.restore(await this.hours.findAll());
  }
}
