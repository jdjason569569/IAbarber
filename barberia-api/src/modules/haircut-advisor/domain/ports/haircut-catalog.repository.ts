import type { Haircut } from '../entities/haircut.entity.js';

export const HAIRCUT_CATALOG_REPOSITORY = Symbol('HAIRCUT_CATALOG_REPOSITORY');

export interface HaircutCatalogRepository {
  /** Cuts the barber offers (inactive ones are left out). */
  findActive(): Promise<Haircut[]>;
  /** Public URLs of the example pictures of a cut; empty when none were uploaded. */
  findImages(haircutId: string): Promise<string[]>;
}
