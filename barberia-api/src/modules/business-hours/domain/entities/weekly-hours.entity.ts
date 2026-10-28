import { InvalidBusinessHoursError } from '../errors/invalid-business-hours.error.js';

/** Opening hours of one weekday. Hours are whole hours; `closeHour` 24 means midnight. */
export interface DayHours {
  /** 0 = Sunday ... 6 = Saturday (same as `Date.getDay()`). */
  weekday: number;
  open: boolean;
  openHour: number;
  closeHour: number;
}

/** Used for every weekday the barber has not configured: 07:00 to midnight. */
export const DEFAULT_OPEN_HOUR = 7;
export const DEFAULT_CLOSE_HOUR = 24;

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function defaultDay(weekday: number): DayHours {
  return { weekday, open: true, openHour: DEFAULT_OPEN_HOUR, closeHour: DEFAULT_CLOSE_HOUR };
}

/** The shop's availability for the seven weekdays. */
export class WeeklyHours {
  private constructor(private readonly days: DayHours[]) {}

  /** Validates the given days; weekdays left out keep the default hours. */
  static create(days: DayHours[]): WeeklyHours {
    for (const day of days) {
      if (!Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6) {
        throw new InvalidBusinessHoursError(`Invalid weekday: ${day.weekday}`);
      }
      if (!Number.isInteger(day.openHour) || day.openHour < 0 || day.openHour > 23) {
        throw new InvalidBusinessHoursError(`Invalid opening hour: ${day.openHour}`);
      }
      if (!Number.isInteger(day.closeHour) || day.closeHour < 1 || day.closeHour > 24) {
        throw new InvalidBusinessHoursError(`Invalid closing hour: ${day.closeHour}`);
      }
      if (day.openHour >= day.closeHour) {
        throw new InvalidBusinessHoursError('The opening hour must be before the closing hour');
      }
    }
    return WeeklyHours.restore(days);
  }

  static restore(days: DayHours[]): WeeklyHours {
    return new WeeklyHours(
      WEEKDAYS.map((weekday) => {
        const day = days.find((d) => d.weekday === weekday);
        return day ? { ...day, open: Boolean(day.open) } : defaultDay(weekday);
      }),
    );
  }

  get all(): DayHours[] {
    return this.days.map((d) => ({ ...d }));
  }

  /** Hours of the weekday of a `YYYY-MM-DD` date. */
  forDate(date: string): DayHours {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    return { ...this.days[weekday] };
  }

  /** True when an appointment may start at `time` (`HH:mm`) on `date`. */
  allows(date: string, time: string): boolean {
    const day = this.forDate(date);
    const hour = Number(time.slice(0, 2));
    return day.open && hour >= day.openHour && hour < day.closeHour;
  }
}
