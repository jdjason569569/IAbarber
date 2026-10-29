import type { TimeBlock } from '../entities/day-blocks.entity.js';

export const DAY_BLOCKS_REPOSITORY = Symbol('DAY_BLOCKS_REPOSITORY');

export interface DayBlocksRepository {
  findByDate(date: string): Promise<TimeBlock[]>;
  /** Replaces every block of the date with the given ones. */
  replace(date: string, blocks: TimeBlock[]): Promise<void>;
}
