import { Injectable } from '@nestjs/common';
import type { StatisticsSummary } from '../../domain/entities/statistics-summary.js';
import type { StatisticsRepository } from '../../domain/ports/statistics.repository.js';

@Injectable()
export class InMemoryStatisticsRepository implements StatisticsRepository {
  async getSummary(): Promise<StatisticsSummary> {
    return {
      totals: [
        { label: 'Appointments this month', value: '128' },
        { label: 'Revenue this month', value: '$3,840' },
        { label: 'New clients', value: '23' },
        { label: 'Cancellation rate', value: '6%' },
      ],
      topServices: [
        { name: 'Classic Haircut', count: 54 },
        { name: 'Haircut + Beard', count: 38 },
        { name: 'Fade Haircut', count: 24 },
        { name: 'Beard Trim', count: 12 },
      ],
      barbers: [
        { name: 'Carlos', appointments: 71, revenue: '$2,130' },
        { name: 'Luis', appointments: 57, revenue: '$1,710' },
      ],
    };
  }
}
