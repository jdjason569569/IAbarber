import { Injectable } from '@nestjs/common';
import { GetServicePriceUseCase } from '../../../shop-settings/application/use-cases/get-service-price.use-case.js';
import type { PublicSlotsDto } from '../dtos/web-booking.dto.js';
import { WebBookingAccess } from '../web-booking-access.js';

/** Free slots of today and tomorrow and the service price, for the public booking page. */
@Injectable()
export class GetPublicSlotsUseCase {
  constructor(
    private readonly access: WebBookingAccess,
    private readonly servicePrice: GetServicePriceUseCase,
  ) {}

  async execute(): Promise<PublicSlotsDto> {
    return { price: await priceOrZero(this.servicePrice), days: await this.access.slots() };
  }
}

/** The price set in the app; 0 if it cannot be read (the barber can fix it in the app). */
export async function priceOrZero(servicePrice: GetServicePriceUseCase): Promise<number> {
  try {
    return await servicePrice.execute();
  } catch (error) {
    console.error('Reading the service price failed:', error instanceof Error ? error.message : error);
    return 0;
  }
}
