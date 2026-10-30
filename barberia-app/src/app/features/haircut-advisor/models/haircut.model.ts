import { FaceShapeResult } from './face-shape.model';

/** A cut of the shop's catalog, ranked by the API for the client's face. */
export interface HaircutRecommendation {
  id: string;
  name: string;
  description: string;
  /** Match between 0 and 1. */
  score: number;
  /** Public URLs of the example pictures; empty when the barber has not uploaded any. */
  images: string[];
}

/** Response of `POST /haircut-recommendations`. */
export interface HaircutRecommendations {
  faceShape: FaceShapeResult;
  recommendations: HaircutRecommendation[];
}
