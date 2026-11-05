import type { Haircut } from '../entities/haircut.entity.js';
import type { Photo } from '../entities/photo.entity.js';

export const HAIRSTYLE_EDITOR = Symbol('HAIRSTYLE_EDITOR');

/** Draws the client of the photo wearing a cut of the catalog. */
export interface HairstyleEditor {
  /** Returns the edited picture. */
  apply(input: { photo: Photo; haircut: Haircut }): Promise<Photo>;
}
