export interface RecommendHaircutsRequest {
  metrics?: {
    lengthToWidth?: number;
    foreheadToCheek?: number;
    jawToCheek?: number;
    chinToCheek?: number;
  };
  /** Optional data URL of the client's photo, analyzed by Gemini and not stored. */
  photo?: string;
}
