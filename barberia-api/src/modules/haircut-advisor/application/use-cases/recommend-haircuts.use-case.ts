import { Inject, Injectable } from '@nestjs/common';
import {
  classifyFaceShape,
  toFaceShapeResult,
  validateFaceMetrics,
} from '../../domain/entities/face-shape.entity.js';
import type { Haircut } from '../../domain/entities/haircut.entity.js';
import { rankHaircuts } from '../../domain/entities/haircut.entity.js';
import { InvalidPhotoError } from '../../domain/errors/invalid-photo.error.js';
import { FACE_PHOTO_ANALYZER } from '../../domain/ports/face-photo-analyzer.port.js';
import type { FacePhotoAnalyzer } from '../../domain/ports/face-photo-analyzer.port.js';
import { HAIRCUT_CATALOG_REPOSITORY } from '../../domain/ports/haircut-catalog.repository.js';
import type { HaircutCatalogRepository } from '../../domain/ports/haircut-catalog.repository.js';
import type {
  HaircutRecommendationsDto,
  RecommendHaircutsInput,
  RecommendedHaircutDto,
} from '../dtos/haircut-recommendations.dto.js';

const MAX_RECOMMENDATIONS = 5;
const PHOTO_DATA_URL =
  /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
/** About 3 MB of image; the app sends a ~1024 px JPEG of a few hundred KB. */
const MAX_PHOTO_BASE64 = 4_000_000;

/**
 * Gemini looks at the photo and picks the cuts of the catalog. When there is no photo, no key, or
 * Gemini fails (quota, network), the face shape is classified from the measured proportions instead.
 */
@Injectable()
export class RecommendHaircutsUseCase {
  constructor(
    @Inject(HAIRCUT_CATALOG_REPOSITORY)
    private readonly catalog: HaircutCatalogRepository,
    @Inject(FACE_PHOTO_ANALYZER)
    private readonly photoAnalyzer: FacePhotoAnalyzer,
  ) {}

  async execute(
    input: RecommendHaircutsInput,
  ): Promise<HaircutRecommendationsDto> {
    const metrics = validateFaceMetrics(input.metrics);
    const photo = input.photo ? parsePhoto(input.photo) : null;
    const haircuts = await this.catalog.findActive();

    if (photo && this.photoAnalyzer.enabled) {
      try {
        const analysis = await this.photoAnalyzer.analyze({
          photo,
          catalog: haircuts,
        });
        const byId = new Map(haircuts.map((h) => [h.id, h]));
        return {
          source: 'gemini',
          faceShape: toFaceShapeResult(analysis.shapeScores),
          hair: { type: analysis.hairType, summary: analysis.summary },
          recommendations: await Promise.all(
            analysis.picks.map((pick) =>
              this.withImages(
                byId.get(pick.haircutId) as Haircut,
                pick.score,
                pick.reason,
              ),
            ),
          ),
        };
      } catch (error) {
        console.error(
          'Gemini haircut analysis failed, using the metrics classifier:',
          error,
        );
      }
    }

    const faceShape = classifyFaceShape(metrics);
    const ranked = rankHaircuts(haircuts, faceShape, MAX_RECOMMENDATIONS);
    return {
      source: 'metrics',
      faceShape,
      hair: null,
      recommendations: await Promise.all(
        ranked.map(({ haircut, score }) =>
          this.withImages(haircut, score, null),
        ),
      ),
    };
  }

  private async withImages(
    haircut: Haircut,
    score: number,
    reason: string | null,
  ): Promise<RecommendedHaircutDto> {
    return {
      id: haircut.id,
      name: haircut.name,
      description: haircut.description,
      score,
      reason: reason || null,
      images: await this.catalog.findImages(haircut.id),
    };
  }
}

function parsePhoto(dataUrl: string): { mimeType: string; base64: string } {
  const match = PHOTO_DATA_URL.exec(dataUrl);
  if (!match) {
    throw new InvalidPhotoError(
      'The photo must be a base64 JPEG, PNG or WebP data URL',
    );
  }
  if (match[2].length > MAX_PHOTO_BASE64) {
    throw new InvalidPhotoError('The photo is too big');
  }
  return { mimeType: match[1], base64: match[2] };
}
