import type { FaceShapeScore } from '../entities/face-shape.entity.js';
import type { Haircut } from '../entities/haircut.entity.js';

export const FACE_PHOTO_ANALYZER = Symbol('FACE_PHOTO_ANALYZER');

export const HAIR_TYPES = ['straight', 'wavy', 'curly', 'coily'] as const;
export type HairType = (typeof HAIR_TYPES)[number];

/** A cut of the catalog chosen for the client, with why it suits them. */
export interface PhotoHaircutPick {
  haircutId: string;
  /** Match between 0 and 1. */
  score: number;
  /** One sentence in Spanish, shown to the barber. */
  reason: string;
}

export interface FacePhotoAnalysis {
  /** Every shape the model considered, not necessarily normalized. */
  shapeScores: FaceShapeScore[];
  hairType: HairType;
  /** Short Spanish description of the hair, hairline and beard, shown to the barber. */
  summary: string;
  /** Best cuts first; ids belong to the catalog that was passed in. */
  picks: PhotoHaircutPick[];
}

/** Looks at the client's photo and picks the cuts of the catalog that suit them. */
export interface FacePhotoAnalyzer {
  /** `false` when no key is configured, so the use case goes straight to the metrics classifier. */
  readonly enabled: boolean;
  analyze(input: {
    photo: { mimeType: string; base64: string };
    catalog: Haircut[];
  }): Promise<FacePhotoAnalysis>;
}
