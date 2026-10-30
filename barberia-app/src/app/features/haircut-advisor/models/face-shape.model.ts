export const FACE_SHAPES = ['oval', 'round', 'square', 'oblong', 'heart', 'diamond', 'triangle'] as const;

export type FaceShape = (typeof FACE_SHAPES)[number];

export interface FaceShapeScore {
  shape: FaceShape;
  /** Probability between 0 and 1; all scores add up to 1. */
  probability: number;
}

export interface FaceShapeResult {
  shape: FaceShape;
  confidence: number;
  /** Every shape, most likely first. */
  ranking: FaceShapeScore[];
}
