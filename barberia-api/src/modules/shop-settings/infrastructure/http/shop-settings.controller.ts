import { BadRequestException, Body, Controller, Get, Put } from '@nestjs/common';
import { GetServicePriceUseCase } from '../../application/use-cases/get-service-price.use-case.js';
import { UpdateServicePriceUseCase } from '../../application/use-cases/update-service-price.use-case.js';
import { GetBarberNameUseCase } from '../../application/use-cases/get-barber-name.use-case.js';
import { UpdateBarberNameUseCase } from '../../application/use-cases/update-barber-name.use-case.js';
import { InvalidBarberNameError } from '../../domain/errors/invalid-barber-name.error.js';
import { InvalidServicePriceError } from '../../domain/errors/invalid-service-price.error.js';

interface ServicePriceRequest {
  price?: unknown;
}

interface BarberNameRequest {
  name?: unknown;
}

@Controller('settings')
export class ShopSettingsController {
  constructor(
    private readonly getServicePrice: GetServicePriceUseCase,
    private readonly updateServicePrice: UpdateServicePriceUseCase,
    private readonly getBarberName: GetBarberNameUseCase,
    private readonly updateBarberName: UpdateBarberNameUseCase,
  ) {}

  @Get('barber-name')
  async getName() {
    return { name: await this.getBarberName.execute() };
  }

  @Put('barber-name')
  async updateName(@Body() body: BarberNameRequest) {
    if (typeof body?.name !== 'string') throw new BadRequestException('name must be a string');
    try {
      return { name: await this.updateBarberName.execute(body.name) };
    } catch (error) {
      if (error instanceof InvalidBarberNameError) throw new BadRequestException(error.message);
      throw error;
    }
  }

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
