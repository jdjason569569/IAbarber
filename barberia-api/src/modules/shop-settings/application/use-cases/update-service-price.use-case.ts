import { Inject, Injectable } from '@nestjs/common';
import { InvalidServicePriceError } from '../../domain/errors/invalid-service-price.error.js';
import { SHOP_SETTINGS_REPOSITORY } from '../../domain/ports/shop-settings.repository.js';
import type { ShopSettingsRepository } from '../../domain/ports/shop-settings.repository.js';

/** Highest accepted price, to catch typos like an extra zero row of digits. */
export const MAX_SERVICE_PRICE = 10_000_000;

@Injectable()
export class UpdateServicePriceUseCase {
  constructor(@Inject(SHOP_SETTINGS_REPOSITORY) private readonly settings: ShopSettingsRepository) {}

  async execute(price: number): Promise<number> {
    if (!Number.isInteger(price) || price < 0 || price > MAX_SERVICE_PRICE) {
      throw new InvalidServicePriceError(`The price must be a whole number between 0 and ${MAX_SERVICE_PRICE}`);
    }
    await this.settings.saveServicePrice(price);
    return price;
  }
}
