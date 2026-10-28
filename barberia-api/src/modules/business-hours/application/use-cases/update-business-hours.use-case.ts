import { Inject, Injectable } from '@nestjs/common';
import { WeeklyHours } from '../../domain/entities/weekly-hours.entity.js';
import { BUSINESS_HOURS_REPOSITORY } from '../../domain/ports/business-hours.repository.js';
import type { BusinessHoursRepository } from '../../domain/ports/business-hours.repository.js';
import type { DayHoursDto } from '../dtos/business-hours.dto.js';

@Injectable()
export class UpdateBusinessHoursUseCase {
  constructor(
    @Inject(BUSINESS_HOURS_REPOSITORY) private readonly hours: BusinessHoursRepository,
  ) {}

  async execute(days: DayHoursDto[]): Promise<DayHoursDto[]> {
    const weekly = WeeklyHours.create(days);
    await this.hours.saveAll(weekly.all);
    return weekly.all;
  }
}
