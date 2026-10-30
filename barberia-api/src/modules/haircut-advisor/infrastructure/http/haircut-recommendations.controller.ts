import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { RecommendHaircutsUseCase } from '../../application/use-cases/recommend-haircuts.use-case.js';
import { InvalidFaceMetricsError } from '../../domain/errors/invalid-face-metrics.error.js';
import type { RecommendHaircutsRequest } from './recommend-haircuts.request.js';

@Controller('haircut-recommendations')
export class HaircutRecommendationsController {
  constructor(private readonly recommendHaircuts: RecommendHaircutsUseCase) {}

  /** Receives only the face proportions measured on the phone; the photo never leaves the device. */
  @Post()
  async recommend(@Body() body: RecommendHaircutsRequest) {
    const metrics = body?.metrics;
    try {
      return await this.recommendHaircuts.execute({
        lengthToWidth: Number(metrics?.lengthToWidth),
        foreheadToCheek: Number(metrics?.foreheadToCheek),
        jawToCheek: Number(metrics?.jawToCheek),
        chinToCheek: Number(metrics?.chinToCheek),
      });
    } catch (error) {
      if (error instanceof InvalidFaceMetricsError) throw new BadRequestException(error.message);
      throw error;
    }
  }
}
