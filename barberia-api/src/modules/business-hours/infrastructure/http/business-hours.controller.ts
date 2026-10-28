import { BadRequestException, Body, Controller, Get, Put } from '@nestjs/common';
import { GetBusinessHoursUseCase } from '../../application/use-cases/get-business-hours.use-case.js';
import { UpdateBusinessHoursUseCase } from '../../application/use-cases/update-business-hours.use-case.js';
import { InvalidBusinessHoursError } from '../../domain/errors/invalid-business-hours.error.js';
import type { DayHoursRequest } from './update-business-hours.request.js';

@Controller('business-hours')
export class BusinessHoursController {
  constructor(
    private readonly getBusinessHours: GetBusinessHoursUseCase,
    private readonly updateBusinessHours: UpdateBusinessHoursUseCase,
  ) {}

  @Get()
  async get() {
    return (await this.getBusinessHours.execute()).all;
  }

  @Put()
  async update(@Body() body: DayHoursRequest[]) {
    if (!Array.isArray(body)) {
      throw new BadRequestException('Expected the list of weekdays');
    }
    try {
      return await this.updateBusinessHours.execute(
        body.map((d) => ({
          weekday: Number(d?.weekday),
          open: Boolean(d?.open),
          openHour: Number(d?.openHour),
          closeHour: Number(d?.closeHour),
        })),
      );
    } catch (error) {
      if (error instanceof InvalidBusinessHoursError) throw new BadRequestException(error.message);
      throw error;
    }
  }
}
