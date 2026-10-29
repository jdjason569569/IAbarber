import { Module } from '@nestjs/common';
import { supabaseProvider } from '../../shared/supabase/supabase.provider.js';
import { GetBusinessHoursUseCase } from './application/use-cases/get-business-hours.use-case.js';
import { GetDayBlocksUseCase } from './application/use-cases/get-day-blocks.use-case.js';
import { SaveDayBlocksUseCase } from './application/use-cases/save-day-blocks.use-case.js';
import { UpdateBusinessHoursUseCase } from './application/use-cases/update-business-hours.use-case.js';
import { BUSINESS_HOURS_REPOSITORY } from './domain/ports/business-hours.repository.js';
import { DAY_BLOCKS_REPOSITORY } from './domain/ports/day-blocks.repository.js';
import { BusinessHoursController } from './infrastructure/http/business-hours.controller.js';
import { InMemoryBusinessHoursRepository } from './infrastructure/persistence/in-memory-business-hours.repository.js';
import { SupabaseBusinessHoursRepository } from './infrastructure/persistence/supabase-business-hours.repository.js';
import { InMemoryDayBlocksRepository } from './infrastructure/persistence/in-memory-day-blocks.repository.js';
import { SupabaseDayBlocksRepository } from './infrastructure/persistence/supabase-day-blocks.repository.js';

// Uses Supabase when credentials are configured; falls back to memory for local development.
const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

@Module({
  controllers: [BusinessHoursController],
  providers: [
    GetBusinessHoursUseCase,
    UpdateBusinessHoursUseCase,
    GetDayBlocksUseCase,
    SaveDayBlocksUseCase,
    ...(useSupabase ? [supabaseProvider] : []),
    {
      provide: BUSINESS_HOURS_REPOSITORY,
      useClass: useSupabase ? SupabaseBusinessHoursRepository : InMemoryBusinessHoursRepository,
    },
    {
      provide: DAY_BLOCKS_REPOSITORY,
      useClass: useSupabase ? SupabaseDayBlocksRepository : InMemoryDayBlocksRepository,
    },
  ],
  exports: [GetBusinessHoursUseCase, GetDayBlocksUseCase, SaveDayBlocksUseCase],
})
export class BusinessHoursModule {}
