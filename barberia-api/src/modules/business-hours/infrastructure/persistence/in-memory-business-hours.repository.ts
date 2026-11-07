import { Injectable } from '@nestjs/common';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import type { DayHours } from '../../domain/entities/weekly-hours.entity.js';
import type { BusinessHoursRepository } from '../../domain/ports/business-hours.repository.js';

@Injectable()
export class InMemoryBusinessHoursRepository implements BusinessHoursRepository {
  /** Configured days per workspace id. */
  private readonly items = new Map<string, DayHours[]>();

  async findAll(): Promise<DayHours[]> {
    return (this.items.get(WorkspaceContext.currentId()) ?? []).map((d) => ({ ...d }));
  }

  async saveAll(days: DayHours[]): Promise<void> {
    const workspaceId = WorkspaceContext.currentId();
    const changed = new Set(days.map((d) => d.weekday));
    const kept = (this.items.get(workspaceId) ?? []).filter((d) => !changed.has(d.weekday));
    this.items.set(workspaceId, [...kept, ...days.map((d) => ({ ...d }))]);
  }
}
