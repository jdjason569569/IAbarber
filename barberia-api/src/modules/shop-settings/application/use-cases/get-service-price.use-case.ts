import { Inject, Injectable } from '@nestjs/common';
import { SHOP_SETTINGS_REPOSITORY } from '../../domain/ports/shop-settings.repository.js';
import type { ShopSettingsRepository } from '../../domain/ports/shop-settings.repository.js';

/** Value of the haircut configured by the barber (used for WhatsApp bookings). */
@Injectable()
export class GetServicePriceUseCase {
  constructor(@Inject(SHOP_SETTINGS_REPOSITORY) private readonly settings: ShopSettingsRepository) {}

  execute(): Promise<number> {
    return this.settings.getServicePrice();
  }
}
