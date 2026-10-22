import { Module } from '@nestjs/common';
import { supabaseProvider } from '../../shared/supabase/supabase.provider.js';
import { AddServiceUseCase } from './application/use-cases/add-service.use-case.js';
import { ListServicesUseCase } from './application/use-cases/list-services.use-case.js';
import { RemoveServiceUseCase } from './application/use-cases/remove-service.use-case.js';
import { SERVICE_REPOSITORY } from './domain/ports/service.repository.js';
import { ServicesController } from './infrastructure/http/services.controller.js';
import { InMemoryServiceRepository } from './infrastructure/persistence/in-memory-service.repository.js';
import { SupabaseServiceRepository } from './infrastructure/persistence/supabase-service.repository.js';

// Uses Supabase when credentials are configured; falls back to memory for local development.
const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

@Module({
  controllers: [ServicesController],
  providers: [
    ListServicesUseCase,
    AddServiceUseCase,
    RemoveServiceUseCase,
    ...(useSupabase ? [supabaseProvider] : []),
    {
      provide: SERVICE_REPOSITORY,
      useClass: useSupabase ? SupabaseServiceRepository : InMemoryServiceRepository,
    },
  ],
  exports: [ListServicesUseCase],
})
export class ServicesModule {}
