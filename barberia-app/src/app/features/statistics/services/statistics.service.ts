import { Injectable } from '@angular/core';
import { STATISTICS_MOCK } from '../data/statistics.mock';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  // Mock source until the NestJS API exists.
  getStatistics() {
    return STATISTICS_MOCK;
  }
}
