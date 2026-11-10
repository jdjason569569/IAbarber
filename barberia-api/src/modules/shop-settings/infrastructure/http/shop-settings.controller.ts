import { BadRequestException, Body, Controller, Get, Put } from '@nestjs/common';
import { GetServicePriceUseCase } from '../../application/use-cases/get-service-price.use-case.js';
import { UpdateServicePriceUseCase } from '../../application/use-cases/update-service-price.use-case.js';
import { InvalidServicePriceError } from '../../domain/errors/invalid-service-price.error.js';

interface ServicePriceRequest {
  price?: unknown;
}

@Controller('settings')
export class ShopSettingsController {
  constructor(
    private readonly getServicePrice: GetServicePriceUseCase,
    private readonly updateServicePrice: UpdateServicePriceUseCase,
  ) {}

  @Get('service-price')
  async get() {
    return { price: await this.getServicePrice.execute() };
  }

  @Put('service-price')
  async update(@Body() body: ServicePriceRequest) {
    try {
      return { price: await this.updateServicePrice.execute(Number(body?.price)) };
    } catch (error) {
      if (error instanceof InvalidServicePriceError) throw new BadRequestException(error.message);
      throw error;
    }
  }
}
