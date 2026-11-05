/** Why a picture of the client with a cut could not be generated; each code has its message. */
export type HaircutPreviewErrorCode = 'quota' | 'failed';

/** Picture of the client with one cut, generated on request and kept until a new photo is taken. */
export type HaircutPreviewState =
  | { status: 'loading' }
  | { status: 'ready'; image: string }
  | { status: 'error'; code: HaircutPreviewErrorCode };
