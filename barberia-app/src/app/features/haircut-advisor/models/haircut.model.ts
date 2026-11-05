import { FaceShapeResult } from './face-shape.model';

/** A cut of the shop's catalog, ranked by the API for the client's face. */
export interface HaircutRecommendation {
  id: string;
  name: string;
  description: string;
  /** Match between 0 and 1. */
  score: number;
  /** Why it suits this client (Spanish, written by Gemini); `null` when the face metrics were used. */
  reason: string | null;
  /** Public URLs of the example pictures; empty when the barber has not uploaded any. */
  images: string[];
}

export type HairType = 'straight' | 'wavy' | 'curly' | 'coily';

/** Hair seen by Gemini on the photo. */
export interface HairAnalysis {
  type: HairType;
  /** Spanish description of the hair, hairline and beard. */
  summary: string;
}

/** Response of `POST /haircut-recommendations`. */
export interface HaircutRecommendations {
  /** `gemini` when the photo was analyzed by AI; `metrics` when the API fell back to the face proportions. */
  source: 'gemini' | 'metrics';
  faceShape: FaceShapeResult;
  hair: HairAnalysis | null;
  recommendations: HaircutRecommendation[];
}
