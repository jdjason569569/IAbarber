import { Inject, Injectable } from '@nestjs/common';
import { classifyFaceShape, validateFaceMetrics } from '../../domain/entities/face-shape.entity.js';
import { rankHaircuts } from '../../domain/entities/haircut.entity.js';
import { HAIRCUT_CATALOG_REPOSITORY } from '../../domain/ports/haircut-catalog.repository.js';
import type { HaircutCatalogRepository } from '../../domain/ports/haircut-catalog.repository.js';
import type { FaceMetricsDto, HaircutRecommendationsDto } from '../dtos/haircut-recommendations.dto.js';

const MAX_RECOMMENDATIONS = 5;

/** Classifies the face shape from the measured proportions and returns the best cuts with their example pictures. */
@Injectable()
export class RecommendHaircutsUseCase {
  constructor(@Inject(HAIRCUT_CATALOG_REPOSITORY) private readonly catalog: HaircutCatalogRepository) {}

  async execute(metrics: FaceMetricsDto): Promise<HaircutRecommendationsDto> {
    const faceShape = classifyFaceShape(validateFaceMetrics(metrics));
    const ranked = rankHaircuts(await this.catalog.findActive(), faceShape, MAX_RECOMMENDATIONS);
    const recommendations = await Promise.all(
      ranked.map(async ({ haircut, score }) => ({
        id: haircut.id,
        name: haircut.name,
        description: haircut.description,
        score,
        images: await this.catalog.findImages(haircut.id),
      })),
    );
    return { faceShape, recommendations };
  }
}
