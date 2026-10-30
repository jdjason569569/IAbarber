import { Module } from '@nestjs/common';
import { supabaseProvider } from '../../shared/supabase/supabase.provider.js';
import { RecommendHaircutsUseCase } from './application/use-cases/recommend-haircuts.use-case.js';
import { HAIRCUT_CATALOG_REPOSITORY } from './domain/ports/haircut-catalog.repository.js';
import { HaircutRecommendationsController } from './infrastructure/http/haircut-recommendations.controller.js';
import { InMemoryHaircutCatalogRepository } from './infrastructure/persistence/in-memory-haircut-catalog.repository.js';
import { SupabaseHaircutCatalogRepository } from './infrastructure/persistence/supabase-haircut-catalog.repository.js';

// Uses Supabase when credentials are configured; falls back to memory for local development.
const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

@Module({
  controllers: [HaircutRecommendationsController],
  providers: [
    RecommendHaircutsUseCase,
    ...(useSupabase ? [supabaseProvider] : []),
    {
      provide: HAIRCUT_CATALOG_REPOSITORY,
      useClass: useSupabase ? SupabaseHaircutCatalogRepository : InMemoryHaircutCatalogRepository,
    },
  ],
})
export class HaircutAdvisorModule {}
