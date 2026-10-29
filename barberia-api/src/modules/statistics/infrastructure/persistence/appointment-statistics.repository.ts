import { Injectable } from '@nestjs/common';
import { ListAppointmentsUseCase } from '../../../appointments/application/use-cases/list-appointments.use-case.js';
import type { AppointmentDto } from '../../../appointments/application/dtos/appointment.dto.js';
import type {
  StatisticsSummary,
  TopService,
} from '../../domain/entities/statistics-summary.js';
import type { StatisticsRepository } from '../../domain/ports/statistics.repository.js';
import { localIsoDate } from '../../../../shared/utils/local-date.js';

/** Builds the summary from the stored appointments of the current month. */
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
    for (const a of all) {
      const key = a.client.trim().toLowerCase();
      const first = firstSeen.get(key);
      if (first === undefined || a.date < first) firstSeen.set(key, a.date);
    }
    const newClients = [...firstSeen.values()].filter((d) => d.startsWith(month)).length;

    return {
      totals: [
        { key: 'appointmentsThisMonth', value: String(active.length) },
        { key: 'revenueThisMonth', value: money(sum(active)) },
        { key: 'newClients', value: String(newClients) },
        {
          key: 'cancellationRate',
          value: `${thisMonth.length ? Math.round((cancelled / thisMonth.length) * 100) : 0}%`,
        },
      ],
      topServices: topServices(active),
    };
  }
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

function topServices(items: AppointmentDto[]): TopService[] {
  const counts = new Map<string, number>();
  for (const a of items) counts.set(a.service, (counts.get(a.service) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((x, y) => y.count - x.count);
}
