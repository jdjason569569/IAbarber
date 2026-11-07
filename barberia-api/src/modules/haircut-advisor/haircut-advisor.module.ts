import { Module } from '@nestjs/common';
import { isSupabaseConfigured } from '../../shared/supabase/supabase.provider.js';
import { GenerateHaircutPreviewUseCase } from './application/use-cases/generate-haircut-preview.use-case.js';
import { RecommendHaircutsUseCase } from './application/use-cases/recommend-haircuts.use-case.js';
import { FACE_PHOTO_ANALYZER } from './domain/ports/face-photo-analyzer.port.js';
import { HAIRSTYLE_EDITOR } from './domain/ports/hairstyle-editor.port.js';
import { HAIRCUT_CATALOG_REPOSITORY } from './domain/ports/haircut-catalog.repository.js';
import { GeminiFacePhotoAnalyzer } from './infrastructure/ai/gemini-face-photo-analyzer.js';
import { GeminiHairstyleEditor } from './infrastructure/ai/gemini-hairstyle-editor.js';
import { HaircutPreviewController } from './infrastructure/http/haircut-preview.controller.js';
import { HaircutRecommendationsController } from './infrastructure/http/haircut-recommendations.controller.js';
import { InMemoryHaircutCatalogRepository } from './infrastructure/persistence/in-memory-haircut-catalog.repository.js';
import { SupabaseHaircutCatalogRepository } from './infrastructure/persistence/supabase-haircut-catalog.repository.js';

// Uses Supabase when credentials are configured; falls back to memory for local development.
const useSupabase = isSupabaseConfigured;

@Module({
  controllers: [HaircutRecommendationsController, HaircutPreviewController],
  providers: [
    RecommendHaircutsUseCase,
    GenerateHaircutPreviewUseCase,
    { provide: HAIRSTYLE_EDITOR, useClass: GeminiHairstyleEditor },
    { provide: FACE_PHOTO_ANALYZER, useClass: GeminiFacePhotoAnalyzer },
    {
      provide: HAIRCUT_CATALOG_REPOSITORY,
      useClass: useSupabase
        ? SupabaseHaircutCatalogRepository
        : InMemoryHaircutCatalogRepository,
    },
  ],
})
export class HaircutAdvisorModule {}
