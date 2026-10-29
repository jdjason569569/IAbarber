import { Inject, Injectable } from '@nestjs/common';
import { DayBlocks } from '../../domain/entities/day-blocks.entity.js';
import type { TimeBlock } from '../../domain/entities/day-blocks.entity.js';
import { DAY_BLOCKS_REPOSITORY } from '../../domain/ports/day-blocks.repository.js';
import type { DayBlocksRepository } from '../../domain/ports/day-blocks.repository.js';

/** Validates and stores the blocks of a date. Clashes with appointments are checked by the caller. */
@Injectable()
export class SaveDayBlocksUseCase {
  constructor(@Inject(DAY_BLOCKS_REPOSITORY) private readonly blocks: DayBlocksRepository) {}

  async execute(day: DayBlocks): Promise<TimeBlock[]> {
    await this.blocks.replace(day.date, day.all);
    return day.all;
  }
}
