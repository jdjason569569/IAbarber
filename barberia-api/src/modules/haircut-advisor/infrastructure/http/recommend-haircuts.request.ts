export interface RecommendHaircutsRequest {
  metrics?: {
    lengthToWidth?: number;
    foreheadToCheek?: number;
    jawToCheek?: number;
    chinToCheek?: number;
  };
}
