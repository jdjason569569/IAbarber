import { Injectable } from '@nestjs/common';
import type { Haircut } from '../../domain/entities/haircut.entity.js';
import type { HaircutCatalogRepository } from '../../domain/ports/haircut-catalog.repository.js';
import { DEFAULT_HAIRCUTS } from './default-haircuts.js';

/** Local development without Supabase: the default catalog and no example pictures. */
@Injectable()
export class InMemoryHaircutCatalogRepository implements HaircutCatalogRepository {
  async findActive(): Promise<Haircut[]> {
    return DEFAULT_HAIRCUTS.map((h) => ({ ...h, suitability: { ...h.suitability } }));
  }

  async findImages(): Promise<string[]> {
    return [];
  }
}
