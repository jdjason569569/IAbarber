import { Module } from '@nestjs/common';
import { isSupabaseConfigured } from '../../shared/supabase/supabase.provider.js';
import { GetServicePriceUseCase } from './application/use-cases/get-service-price.use-case.js';
import { UpdateServicePriceUseCase } from './application/use-cases/update-service-price.use-case.js';
import { SHOP_SETTINGS_REPOSITORY } from './domain/ports/shop-settings.repository.js';
import { ShopSettingsController } from './infrastructure/http/shop-settings.controller.js';
import { InMemoryShopSettingsRepository } from './infrastructure/persistence/in-memory-shop-settings.repository.js';
import { SupabaseShopSettingsRepository } from './infrastructure/persistence/supabase-shop-settings.repository.js';

// Uses Supabase when credentials are configured; falls back to memory for local development.
@Module({
  controllers: [ShopSettingsController],
  providers: [
    GetServicePriceUseCase,
    UpdateServicePriceUseCase,
    {
      provide: SHOP_SETTINGS_REPOSITORY,
      useClass: isSupabaseConfigured ? SupabaseShopSettingsRepository : InMemoryShopSettingsRepository,
    },
  ],
  exports: [GetServicePriceUseCase],
})
export class ShopSettingsModule {}
