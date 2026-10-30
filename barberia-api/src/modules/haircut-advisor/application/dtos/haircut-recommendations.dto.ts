import type { FaceMetrics, FaceShapeResult } from '../../domain/entities/face-shape.entity.js';

export type FaceMetricsDto = FaceMetrics;

export interface RecommendedHaircutDto {
  id: string;
  name: string;
  description: string;
  /** Match between 0 and 1. */
  score: number;
  /** Public URLs of the example pictures. */
  images: string[];
}

export interface HaircutRecommendationsDto {
  faceShape: FaceShapeResult;
  recommendations: RecommendedHaircutDto[];
}
