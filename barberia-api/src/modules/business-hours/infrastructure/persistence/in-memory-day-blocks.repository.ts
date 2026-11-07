import { Injectable } from '@nestjs/common';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import type { TimeBlock } from '../../domain/entities/day-blocks.entity.js';
import type { DayBlocksRepository } from '../../domain/ports/day-blocks.repository.js';

@Injectable()
export class InMemoryDayBlocksRepository implements DayBlocksRepository {
  /** Blocks keyed by "<workspace id>|<date>". */
  private readonly items = new Map<string, TimeBlock[]>();

  async findByDate(date: string): Promise<TimeBlock[]> {
    return (this.items.get(key(date)) ?? []).map((b) => ({ ...b }));
  }

  async replace(date: string, blocks: TimeBlock[]): Promise<void> {
    this.items.set(key(date), blocks.map((b) => ({ ...b })));
  }
}

function key(date: string): string {
  return `${WorkspaceContext.currentId()}|${date}`;
}
