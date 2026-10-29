import { Injectable } from '@nestjs/common';
import type { TimeBlock } from '../../domain/entities/day-blocks.entity.js';
import type { DayBlocksRepository } from '../../domain/ports/day-blocks.repository.js';

@Injectable()
export class InMemoryDayBlocksRepository implements DayBlocksRepository {
  private readonly items = new Map<string, TimeBlock[]>();

  async findByDate(date: string): Promise<TimeBlock[]> {
    return (this.items.get(date) ?? []).map((b) => ({ ...b }));
  }

  async replace(date: string, blocks: TimeBlock[]): Promise<void> {
    this.items.set(date, blocks.map((b) => ({ ...b })));
  }
}
