import { Injectable } from '@nestjs/common';
import type { DayHours } from '../../domain/entities/weekly-hours.entity.js';
import type { BusinessHoursRepository } from '../../domain/ports/business-hours.repository.js';

@Injectable()
export class InMemoryBusinessHoursRepository implements BusinessHoursRepository {
  private items: DayHours[] = [];

  async findAll(): Promise<DayHours[]> {
    return this.items.map((d) => ({ ...d }));
  }

  async saveAll(days: DayHours[]): Promise<void> {
    const changed = new Set(days.map((d) => d.weekday));
    this.items = [...this.items.filter((d) => !changed.has(d.weekday)), ...days.map((d) => ({ ...d }))];
  }
}
