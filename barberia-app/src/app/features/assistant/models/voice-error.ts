export type VoiceErrorCode = 'permission-denied' | 'unavailable' | 'unsupported' | 'no-speech';

/** Failure while listening; the page maps the code to a translated message. */
export class VoiceError extends Error {
  constructor(readonly code: VoiceErrorCode) {
    super(code);
    this.name = 'VoiceError';
  }
}
