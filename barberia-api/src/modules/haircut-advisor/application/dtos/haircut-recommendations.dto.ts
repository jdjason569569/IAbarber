import type {
  FaceMetrics,
  FaceShapeResult,
} from '../../domain/entities/face-shape.entity.js';
import type { HairType } from '../../domain/ports/face-photo-analyzer.port.js';

export type FaceMetricsDto = FaceMetrics;

export interface RecommendHaircutsInput {
  metrics: FaceMetricsDto;
  /** Data URL of the photo (JPEG, PNG or WebP); when present and Gemini works, Gemini picks the cuts. */
  photo?: string;
}

export interface RecommendedHaircutDto {
  id: string;
  name: string;
  description: string;
  /** Match between 0 and 1. */
  score: number;
  /** Why it suits this client (Spanish, from Gemini); `null` with the metrics classifier. */
  reason: string | null;
  /** Public URLs of the example pictures. */
  images: string[];
}

export interface HairAnalysisDto {
  type: HairType;
  /** Spanish description of the hair, hairline and beard. */
  summary: string;
}

export interface HaircutRecommendationsDto {
  /** `gemini` when the photo was analyzed by AI; `metrics` when the measured proportions were used. */
  source: 'gemini' | 'metrics';
  faceShape: FaceShapeResult;
  /** Only with `source: 'gemini'`. */
  hair: HairAnalysisDto | null;
  recommendations: RecommendedHaircutDto[];
}
