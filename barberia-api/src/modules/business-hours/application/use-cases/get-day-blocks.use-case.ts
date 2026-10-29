import { Inject, Injectable } from '@nestjs/common';
import { DayBlocks } from '../../domain/entities/day-blocks.entity.js';
import { DAY_BLOCKS_REPOSITORY } from '../../domain/ports/day-blocks.repository.js';
import type { DayBlocksRepository } from '../../domain/ports/day-blocks.repository.js';

@Injectable()
export class GetDayBlocksUseCase {
  constructor(@Inject(DAY_BLOCKS_REPOSITORY) private readonly blocks: DayBlocksRepository) {}

  /** Hours the barber blocked on `date` (`YYYY-MM-DD`); empty when nothing is blocked. */
  async execute(date: string): Promise<DayBlocks> {
    return DayBlocks.restore(date, await this.blocks.findByDate(date));
  }
}
