import { InvalidFaceMetricsError } from '../errors/invalid-face-metrics.error.js';

export const FACE_SHAPES = ['oval', 'round', 'square', 'oblong', 'heart', 'diamond', 'triangle'] as const;

export type FaceShape = (typeof FACE_SHAPES)[number];

/**
 * Face proportions measured by the app with MediaPipe Face Landmarker on the phone.
 * Widths are relative to the cheekbone width.
 */
export interface FaceMetrics {
  /** Forehead-top to chin length divided by cheekbone width. */
  lengthToWidth: number;
  foreheadToCheek: number;
  jawToCheek: number;
  chinToCheek: number;
}

type MetricKey = keyof FaceMetrics;

const METRIC_KEYS: readonly MetricKey[] = ['lengthToWidth', 'foreheadToCheek', 'jawToCheek', 'chinToCheek'];

/** Ratios outside this range cannot come from a real face; the landmarks were wrong. */
const MIN_RATIO = 0.1;
const MAX_RATIO = 3;

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

/**
 * Typical proportions of each shape, measured with the same MediaPipe landmarks as the app.
 * The MediaPipe canonical (average) face gives 1.15 / 0.82 / 0.78 / 0.30, which anchors the oval
 * prototype; the others move away from it along the trait that defines them.
 * Calibrate with real photos if a shape is detected too often.
 */
const PROTOTYPES: Record<FaceShape, FaceMetrics> = {
  oval: { lengthToWidth: 1.17, foreheadToCheek: 0.81, jawToCheek: 0.77, chinToCheek: 0.3 },
  round: { lengthToWidth: 1.03, foreheadToCheek: 0.81, jawToCheek: 0.8, chinToCheek: 0.33 },
  square: { lengthToWidth: 1.06, foreheadToCheek: 0.86, jawToCheek: 0.87, chinToCheek: 0.37 },
  oblong: { lengthToWidth: 1.34, foreheadToCheek: 0.84, jawToCheek: 0.81, chinToCheek: 0.32 },
  heart: { lengthToWidth: 1.15, foreheadToCheek: 0.88, jawToCheek: 0.71, chinToCheek: 0.25 },
  diamond: { lengthToWidth: 1.2, foreheadToCheek: 0.73, jawToCheek: 0.72, chinToCheek: 0.27 },
  triangle: { lengthToWidth: 1.12, foreheadToCheek: 0.73, jawToCheek: 0.87, chinToCheek: 0.35 },
};

/** Expected spread of each metric between people of the same shape. */
const SPREAD: Record<MetricKey, number> = {
  lengthToWidth: 0.08,
  foreheadToCheek: 0.045,
  jawToCheek: 0.045,
  chinToCheek: 0.045,
};

/** Checks that every metric is a plausible ratio. */
export function validateFaceMetrics(metrics: FaceMetrics): FaceMetrics {
  for (const key of METRIC_KEYS) {
    const value = metrics[key];
    if (!Number.isFinite(value) || value < MIN_RATIO || value > MAX_RATIO) {
      throw new InvalidFaceMetricsError(`Invalid ${key}: ${value}`);
    }
  }
  return { ...metrics };
}

/** Scores every shape by its distance to the prototype and turns the scores into probabilities. */
export function classifyFaceShape(metrics: FaceMetrics): FaceShapeResult {
  const logLikelihoods = FACE_SHAPES.map((shape) => {
    const prototype = PROTOTYPES[shape];
    const distance = METRIC_KEYS.reduce((sum, key) => sum + ((metrics[key] - prototype[key]) / SPREAD[key]) ** 2, 0);
    return -distance / 2;
  });
  const max = Math.max(...logLikelihoods);
  const weights = logLikelihoods.map((value) => Math.exp(value - max));
  const total = weights.reduce((sum, value) => sum + value, 0);
  const ranking = FACE_SHAPES.map((shape, i) => ({ shape, probability: weights[i] / total })).sort(
    (a, b) => b.probability - a.probability,
  );
  return { shape: ranking[0].shape, confidence: ranking[0].probability, ranking };
}
