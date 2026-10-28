import type { DayHours } from '../entities/weekly-hours.entity.js';

export const BUSINESS_HOURS_REPOSITORY = Symbol('BUSINESS_HOURS_REPOSITORY');

export interface BusinessHoursRepository {
  /** Configured weekdays only; missing ones use the default hours. */
  findAll(): Promise<DayHours[]>;
  /** Replaces the hours of every given weekday. */
  saveAll(days: DayHours[]): Promise<void>;
}
