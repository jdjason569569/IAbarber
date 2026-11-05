import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { RecommendHaircutsUseCase } from '../../application/use-cases/recommend-haircuts.use-case.js';
import { InvalidFaceMetricsError } from '../../domain/errors/invalid-face-metrics.error.js';
import { InvalidPhotoError } from '../../domain/errors/invalid-photo.error.js';
import type { RecommendHaircutsRequest } from './recommend-haircuts.request.js';

@Controller('haircut-recommendations')
export class HaircutRecommendationsController {
  constructor(private readonly recommendHaircuts: RecommendHaircutsUseCase) {}

  /**
   * Receives the face proportions measured on the phone and, optionally, the photo. With the photo,
   * Gemini picks the cuts; the photo is not stored.
   */
  @Post()
  async recommend(@Body() body: RecommendHaircutsRequest) {
    const metrics = body?.metrics;
    try {
      return await this.recommendHaircuts.execute({
        metrics: {
          lengthToWidth: Number(metrics?.lengthToWidth),
          foreheadToCheek: Number(metrics?.foreheadToCheek),
          jawToCheek: Number(metrics?.jawToCheek),
          chinToCheek: Number(metrics?.chinToCheek),
        },
        photo: typeof body?.photo === 'string' ? body.photo : undefined,
      });
    } catch (error) {
      if (
        error instanceof InvalidFaceMetricsError ||
        error instanceof InvalidPhotoError
      )
        throw new BadRequestException(error.message);
      throw error;
    }
  }
}
