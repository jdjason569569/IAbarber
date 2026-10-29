import { BadRequestException, Body, ConflictException, Controller, Get, Param, Put } from '@nestjs/common';
import { GetDayBlocksUseCase } from '../../../business-hours/application/use-cases/get-day-blocks.use-case.js';
import { InvalidBusinessHoursError } from '../../../business-hours/domain/errors/invalid-business-hours.error.js';
import { UpdateDayBlocksUseCase } from '../../application/use-cases/update-day-blocks.use-case.js';
import { BlocksClashWithAppointmentsError } from '../../domain/errors/blocks-clash-with-appointments.error.js';

interface TimeBlockRequest {
  fromHour: number;
  toHour: number;
}

/** Hours the barber is not available on a date. Lives here because saving checks the appointments. */
@Controller('business-hours/blocks')
export class DayBlocksController {
  constructor(
    private readonly getDayBlocks: GetDayBlocksUseCase,
    private readonly updateDayBlocks: UpdateDayBlocksUseCase,
  ) {}

  @Get(':date')
  async get(@Param('date') date: string) {
    return (await this.getDayBlocks.execute(date)).all;
  }

  @Put(':date')
  async update(@Param('date') date: string, @Body() body: TimeBlockRequest[]) {
    if (!Array.isArray(body)) {
      throw new BadRequestException('Expected the list of blocks');
    }
    try {
      return await this.updateDayBlocks.execute(
        date,
        body.map((b) => ({ fromHour: Number(b?.fromHour), toHour: Number(b?.toHour) })),
      );
    } catch (error) {
      if (error instanceof InvalidBusinessHoursError) throw new BadRequestException(error.message);
      if (error instanceof BlocksClashWithAppointmentsError) {
        throw new ConflictException({ message: error.message, appointments: error.appointments });
      }
      throw error;
    }
  }
}
