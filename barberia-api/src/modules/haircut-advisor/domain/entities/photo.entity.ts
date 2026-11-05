import { InvalidPhotoError } from '../errors/invalid-photo.error.js';

/** A picture sent by the app, already split from its data URL. */
export interface Photo {
  mimeType: string;
  base64: string;
}

const PHOTO_DATA_URL =
  /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
/** About 3 MB of image; the app sends a ~1024 px JPEG of a few hundred KB. */
const MAX_PHOTO_BASE64 = 4_000_000;

export function parsePhoto(dataUrl: string): Photo {
  const match = PHOTO_DATA_URL.exec(dataUrl);
  if (!match) {
    throw new InvalidPhotoError(
      'The photo must be a base64 JPEG, PNG or WebP data URL',
    );
  }
  if (match[2].length > MAX_PHOTO_BASE64) {
    throw new InvalidPhotoError('The photo is too big');
  }
  return { mimeType: match[1], base64: match[2] };
}
