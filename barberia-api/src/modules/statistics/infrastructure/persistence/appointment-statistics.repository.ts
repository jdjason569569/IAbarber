import { Injectable } from '@nestjs/common';
import { ListAppointmentsUseCase } from '../../../appointments/application/use-cases/list-appointments.use-case.js';
import type { AppointmentDto } from '../../../appointments/application/dtos/appointment.dto.js';
import type {
  DailyStatistic,
  HourlyStatistic,
  StatisticsSummary,
  WeekdayHourStatistic,
} from '../../domain/entities/statistics-summary.js';
import type { StatisticsRepository } from '../../domain/ports/statistics.repository.js';
import { localIsoDate } from '../../../../shared/utils/local-date.js';

/** Days of history behind the charts (about four months). */
const HISTORY_DAYS = 120;

/** Builds the summary from the stored appointments: totals of this month and the history for the charts. */
@Injectable()
export class AppointmentStatisticsRepository implements StatisticsRepository {
  constructor(private readonly listAppointments: ListAppointmentsUseCase) {}

  async getSummary(): Promise<StatisticsSummary> {
    const all = await this.listAppointments.execute();
    const month = localIsoDate().slice(0, 7);
    const thisMonth = all.filter((a) => a.date.startsWith(month));
    const active = thisMonth.filter((a) => !a.cancelled);
    const cancelled = thisMonth.length - active.length;

    const firstSeen = new Map<string, string>();
    // Walk-ins are anonymous ("Cliente casual"), so they never count as new clients.
    for (const a of all.filter((x) => !x.walkIn)) {
      const key = a.client.trim().toLowerCase();
      const first = firstSeen.get(key);
      if (first === undefined || a.date < first) firstSeen.set(key, a.date);
    }
    const newClients = [...firstSeen.values()].filter((d) => d.startsWith(month)).length;

    return {
      totals: [
        { key: 'appointmentsThisMonth', value: String(active.length) },
        { key: 'revenueThisMonth', value: money(sum(active.filter((a) => a.completed))) },
        { key: 'newClients', value: String(newClients) },
        {
          key: 'cancellationRate',
          value: `${thisMonth.length ? Math.round((cancelled / thisMonth.length) * 100) : 0}%`,
        },
      ],
      ...history(all, firstSeen),
    };
  }
}

/**
 * Per-day, per-day-and-hour and weekday × hour counts of the last HISTORY_DAYS, up to today (future
 * bookings excluded). `firstSeen` holds the first appointment date of every (non walk-in) client.
 */
function history(
  all: AppointmentDto[],
  firstSeen: Map<string, string>,
): Pick<StatisticsSummary, 'daily' | 'hourly' | 'weekdayHour'> {
  const today = localIsoDate();
  const start = new Date();
  start.setDate(start.getDate() - (HISTORY_DAYS - 1));
  const from = localIsoDate(start);
  const inWindow = all.filter((a) => a.date >= from && a.date <= today);

  const days = new Map<string, DailyStatistic>();
  const dayOf = (date: string): DailyStatistic => {
    const day = days.get(date) ?? { date, appointments: 0, revenue: 0, cancelled: 0, newClients: 0 };
    days.set(date, day);
    return day;
  };
  for (const date of firstSeen.values()) {
    if (date >= from && date <= today) dayOf(date).newClients += 1;
  }

  const hours = new Map<string, HourlyStatistic>();
  const cells = new Map<string, WeekdayHourStatistic>();
  for (const a of inWindow) {
    const day = dayOf(a.date);
    if (a.cancelled) {
      day.cancelled += 1;
      continue;
    }
    day.appointments += 1;
    if (a.completed) day.revenue += total(a);

    const hourKey = `${a.date}|${a.time.slice(0, 2)}`;
    const slot = hours.get(hourKey) ?? { date: a.date, hour: Number(a.time.slice(0, 2)), appointments: 0 };
    slot.appointments += 1;
    hours.set(hourKey, slot);

    const weekday = (new Date(`${a.date}T12:00:00`).getDay() + 6) % 7;
    const hour = Number(a.time.slice(0, 2));
    const key = `${weekday}|${hour}`;
    const cell = cells.get(key) ?? { weekday, hour, appointments: 0 };
    cell.appointments += 1;
    cells.set(key, cell);
  }
  return {
    daily: [...days.values()].sort((x, y) => x.date.localeCompare(y.date)),
    hourly: [...hours.values()],
    weekdayHour: [...cells.values()],
  };
}

function total(a: AppointmentDto): number {
  return a.extras.reduce((acc, e) => acc + e.price, a.serviceCost);
}

function sum(items: AppointmentDto[]): number {
  return items.reduce((acc, a) => acc + total(a), 0);
}

function money(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}
