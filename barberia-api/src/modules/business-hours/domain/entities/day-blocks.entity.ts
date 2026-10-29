import { InvalidBusinessHoursError } from '../errors/invalid-business-hours.error.js';

/** A stretch of one day when the barber is not available. Whole hours; `toHour` 24 means midnight. */
export interface TimeBlock {
  fromHour: number;
  toHour: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The hours of a single date the barber blocked (lunch, an errand...). */
export class DayBlocks {
  private constructor(
    readonly date: string,
    private readonly blocks: TimeBlock[],
  ) {}

  /** Validates the blocks: whole hours, start before end and no overlaps. */
  static create(date: string, blocks: TimeBlock[]): DayBlocks {
    if (!ISO_DATE.test(date)) {
      throw new InvalidBusinessHoursError(`Invalid date: ${date}`);
    }
    for (const block of blocks) {
      if (!Number.isInteger(block.fromHour) || block.fromHour < 0 || block.fromHour > 23) {
        throw new InvalidBusinessHoursError(`Invalid start hour: ${block.fromHour}`);
      }
      if (!Number.isInteger(block.toHour) || block.toHour < 1 || block.toHour > 24) {
        throw new InvalidBusinessHoursError(`Invalid end hour: ${block.toHour}`);
      }
      if (block.fromHour >= block.toHour) {
        throw new InvalidBusinessHoursError('The start hour must be before the end hour');
      }
    }
    const sorted = DayBlocks.restore(date, blocks).all;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].fromHour < sorted[i - 1].toHour) {
        throw new InvalidBusinessHoursError('Blocks must not overlap');
      }
    }
    return DayBlocks.restore(date, sorted);
  }

  static restore(date: string, blocks: TimeBlock[]): DayBlocks {
    const sorted = blocks
      .map((b) => ({ fromHour: b.fromHour, toHour: b.toHour }))
      .sort((a, b) => a.fromHour - b.fromHour);
    return new DayBlocks(date, sorted);
  }

  get all(): TimeBlock[] {
    return this.blocks.map((b) => ({ ...b }));
  }

  /** The block that contains `time` (`HH:mm`), if any. */
  covering(time: string): TimeBlock | undefined {
    const hour = Number(time.slice(0, 2));
    const block = this.blocks.find((b) => hour >= b.fromHour && hour < b.toHour);
    return block ? { ...block } : undefined;
  }
}
