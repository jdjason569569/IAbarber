import type { FaceShape, FaceShapeResult } from './face-shape.entity.js';

/** A cut of the shop's catalog. */
export interface Haircut {
  /** Stable slug, also the folder of its example pictures (e.g. `pompadour`). */
  id: string;
  name: string;
  description: string;
  /** How well the cut suits each face shape (0 to 1). Missing shapes count as 0. */
  suitability: Partial<Record<FaceShape, number>>;
}

export interface RankedHaircut {
  haircut: Haircut;
  /** Match between 0 and 1. */
  score: number;
}

/**
 * Ranks the cuts by suitability weighted with every shape's probability, so a face that is
 * half oval and half round gets cuts that work for both.
 */
export function rankHaircuts(haircuts: Haircut[], faceShape: FaceShapeResult, limit: number): RankedHaircut[] {
  return haircuts
    .map((haircut) => ({
      haircut,
      score: faceShape.ranking.reduce(
        (sum, { shape, probability }) => sum + probability * (haircut.suitability[shape] ?? 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
