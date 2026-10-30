import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../../shared/supabase/supabase.provider.js';
import type { FaceShape } from '../../domain/entities/face-shape.entity.js';
import type { Haircut } from '../../domain/entities/haircut.entity.js';
import type { HaircutCatalogRepository } from '../../domain/ports/haircut-catalog.repository.js';

interface HaircutRow {
  id: string;
  name: string;
  description: string;
  suitability: Partial<Record<FaceShape, number>>;
}

const TABLE = 'haircuts';
/** Public Storage bucket; the example pictures of a cut go in the folder named after its id. */
const BUCKET = 'haircut-images';
const IMAGE_FILE = /\.(jpe?g|png|webp)$/i;

@Injectable()
export class SupabaseHaircutCatalogRepository implements HaircutCatalogRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findActive(): Promise<Haircut[]> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('id, name, description, suitability')
      .eq('active', true)
      .order('sort_order');
    if (error) throw new Error(error.message);
    return (data as HaircutRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      suitability: row.suitability ?? {},
    }));
  }

  async findImages(haircutId: string): Promise<string[]> {
    const storage = this.supabase.storage.from(BUCKET);
    const { data, error } = await storage.list(haircutId, { sortBy: { column: 'name', order: 'asc' } });
    // A missing picture must not break the recommendation: show the cut without examples.
    if (error) {
      console.error(`Haircut images of ${haircutId} failed:`, error.message);
      return [];
    }
    return data
      .filter((file) => IMAGE_FILE.test(file.name))
      .map((file) => storage.getPublicUrl(`${haircutId}/${file.name}`).data.publicUrl);
  }
}
