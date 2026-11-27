import { Inject, Injectable } from '@nestjs/common';
import { InvalidBarberNameError } from '../../domain/errors/invalid-barber-name.error.js';
import { SHOP_SETTINGS_REPOSITORY } from '../../domain/ports/shop-settings.repository.js';
import type { ShopSettingsRepository } from '../../domain/ports/shop-settings.repository.js';

/** A first name or a nickname; long enough for "Juan Sebastián". */
export const MAX_BARBER_NAME_LENGTH = 40;

@Injectable()
export class UpdateBarberNameUseCase {
  constructor(@Inject(SHOP_SETTINGS_REPOSITORY) private readonly settings: ShopSettingsRepository) {}

  /** Saves the trimmed name; an empty name turns the personal greeting off. */
  async execute(name: string): Promise<string> {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (clean.length > MAX_BARBER_NAME_LENGTH) {
      throw new InvalidBarberNameError(`The name must have at most ${MAX_BARBER_NAME_LENGTH} characters`);
    }
    await this.settings.saveBarberName(clean);
    return clean;
  }
}
