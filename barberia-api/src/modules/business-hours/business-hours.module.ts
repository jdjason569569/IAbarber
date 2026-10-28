import { Module } from '@nestjs/common';
import { supabaseProvider } from '../../shared/supabase/supabase.provider.js';
import { GetBusinessHoursUseCase } from './application/use-cases/get-business-hours.use-case.js';
import { UpdateBusinessHoursUseCase } from './application/use-cases/update-business-hours.use-case.js';
import { BUSINESS_HOURS_REPOSITORY } from './domain/ports/business-hours.repository.js';
import { BusinessHoursController } from './infrastructure/http/business-hours.controller.js';
import { InMemoryBusinessHoursRepository } from './infrastructure/persistence/in-memory-business-hours.repository.js';
import { SupabaseBusinessHoursRepository } from './infrastructure/persistence/supabase-business-hours.repository.js';

// Uses Supabase when credentials are configured; falls back to memory for local development.
const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

@Module({
  controllers: [BusinessHoursController],
  providers: [
    GetBusinessHoursUseCase,
    UpdateBusinessHoursUseCase,
    ...(useSupabase ? [supabaseProvider] : []),
    {
      provide: BUSINESS_HOURS_REPOSITORY,
      useClass: useSupabase ? SupabaseBusinessHoursRepository : InMemoryBusinessHoursRepository,
    },
  ],
  exports: [GetBusinessHoursUseCase],
})
export class BusinessHoursModule {}
