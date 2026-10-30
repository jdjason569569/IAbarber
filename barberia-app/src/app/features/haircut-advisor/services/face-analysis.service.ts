import { Injectable } from '@angular/core';
import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { FaceAnalysis, FaceAnalysisError, FaceMetrics } from '../models/face-metrics.model';

/** MediaPipe runtime and model are bundled in assets so the analysis works offline. */
const WASM_PATH = 'assets/mediapipe/wasm';
const MODEL_PATH = 'assets/mediapipe/face_landmarker.task';

/** Beyond this head rotation the face widths are distorted and the shape is not reliable. */
const MAX_ROTATION_DEGREES = 15;

/** MediaPipe face mesh landmark indices used for the measurements. */
const LANDMARK = {
  foreheadTop: 10,
  chin: 152,
  cheekLeft: 234,
  cheekRight: 454,
  foreheadLeft: 54,
  foreheadRight: 284,
  jawLeft: 172,
  jawRight: 397,
  chinLeft: 176,
  chinRight: 400,
} as const;

/** Detects the face on a photo, on the device, and measures its proportions. */
@Injectable({ providedIn: 'root' })
export class FaceAnalysisService {
  private landmarker: Promise<FaceLandmarker> | null = null;

  async analyze(imageDataUrl: string): Promise<FaceAnalysis> {
    const [landmarker, image] = await Promise.all([this.getLandmarker(), loadImage(imageDataUrl)]);
    const result = landmarker.detect(image);
    const landmarks = result.faceLandmarks[0];
    if (!landmarks) {
      throw new FaceAnalysisError('noFace');
    }
    const { yawDegrees, pitchDegrees } = headRotation(result.facialTransformationMatrixes[0]?.data);
    if (Math.abs(yawDegrees) > MAX_ROTATION_DEGREES || Math.abs(pitchDegrees) > MAX_ROTATION_DEGREES) {
      throw new FaceAnalysisError('headTurned');
    }
    return {
      metrics: measure(landmarks, image.naturalWidth, image.naturalHeight),
      yawDegrees,
      pitchDegrees,
    };
  }

  /** Loads the model once, on first use; a failed load is retried on the next call. */
  private getLandmarker(): Promise<FaceLandmarker> {
    this.landmarker ??= FilesetResolver.forVisionTasks(WASM_PATH)
      .then((fileset) =>
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'CPU' },
          runningMode: 'IMAGE',
          numFaces: 1,
          outputFacialTransformationMatrixes: true,
        }),
      )
      .catch((error: unknown) => {
        console.error('FaceLandmarker failed to load', error);
        this.landmarker = null;
        throw new FaceAnalysisError('modelLoad');
      });
    return this.landmarker;
  }
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new FaceAnalysisError('imageLoad'));
    image.src = dataUrl;
  });
}

function measure(landmarks: NormalizedLandmark[], width: number, height: number): FaceMetrics {
  // Landmarks are normalized to the image size, so scale both axes back to pixels.
  const distance = (a: number, b: number) =>
    Math.hypot((landmarks[a].x - landmarks[b].x) * width, (landmarks[a].y - landmarks[b].y) * height);
  const cheekWidth = distance(LANDMARK.cheekLeft, LANDMARK.cheekRight);
  return {
    lengthToWidth: distance(LANDMARK.foreheadTop, LANDMARK.chin) / cheekWidth,
    foreheadToCheek: distance(LANDMARK.foreheadLeft, LANDMARK.foreheadRight) / cheekWidth,
    jawToCheek: distance(LANDMARK.jawLeft, LANDMARK.jawRight) / cheekWidth,
    chinToCheek: distance(LANDMARK.chinLeft, LANDMARK.chinRight) / cheekWidth,
  };
}

/** Reads yaw and pitch from the column-major 4x4 face transformation matrix. */
function headRotation(matrix: number[] | undefined): { yawDegrees: number; pitchDegrees: number } {
  if (!matrix) {
    return { yawDegrees: 0, pitchDegrees: 0 };
  }
  // Third column: where the face points in camera space.
  const [x, y, z] = [matrix[8], matrix[9], matrix[10]];
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;
  return {
    yawDegrees: toDegrees(Math.atan2(x, z)),
    pitchDegrees: toDegrees(Math.atan2(-y, Math.hypot(x, z))),
  };
}
