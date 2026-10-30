/** Face proportions measured on the photo. Widths are relative to the cheekbone width. */
export interface FaceMetrics {
  /** Forehead-top to chin length divided by cheekbone width. */
  lengthToWidth: number;
  foreheadToCheek: number;
  jawToCheek: number;
  chinToCheek: number;
}

export interface FaceAnalysis {
  metrics: FaceMetrics;
  yawDegrees: number;
  pitchDegrees: number;
}

export type FaceAnalysisErrorCode = 'modelLoad' | 'imageLoad' | 'noFace' | 'headTurned';

export class FaceAnalysisError extends Error {
  constructor(readonly code: FaceAnalysisErrorCode) {
    super(`Face analysis failed: ${code}`);
  }
}
