import { Inject, Injectable } from '@nestjs/common';
import { SHOP_SETTINGS_REPOSITORY } from '../../domain/ports/shop-settings.repository.js';
import type { ShopSettingsRepository } from '../../domain/ports/shop-settings.repository.js';

/** Name the reminders call the barber by; empty while it was never configured. */
@Injectable()
export class GetBarberNameUseCase {
  constructor(@Inject(SHOP_SETTINGS_REPOSITORY) private readonly settings: ShopSettingsRepository) {}

  execute(): Promise<string> {
    return this.settings.getBarberName();
  }
}
