import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../../shared/supabase/supabase.provider.js';
import { BarberService } from '../../domain/entities/barber-service.entity.js';
import { DuplicateServiceError } from '../../domain/errors/duplicate-service.error.js';
import type { ServiceRepository } from '../../domain/ports/service.repository.js';

interface ServiceRow {
  id: number;
  name: string;
  price: number;
}

const TABLE = 'services';
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class SupabaseServiceRepository implements ServiceRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findAll(): Promise<BarberService[]> {
    const { data, error } = await this.supabase.from(TABLE).select('*').order('id');
    if (error) throw new Error(error.message);
    return (data as ServiceRow[]).map(toEntity);
  }

  async findByName(name: string): Promise<BarberService | null> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('*')
      .ilike('name', escapeLike(name.trim()))
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toEntity(data as ServiceRow) : null;
  }

  async save(service: BarberService): Promise<BarberService> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .insert({ name: service.name, price: service.price })
      .select()
      .single();
    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        throw new DuplicateServiceError(`Service "${service.name}" already exists`);
      }
      throw new Error(error.message);
    }
    return toEntity(data as ServiceRow);
  }

  async deleteById(id: number): Promise<boolean> {
    const { data, error } = await this.supabase.from(TABLE).delete().eq('id', id).select('id');
    if (error) throw new Error(error.message);
    return (data?.length ?? 0) > 0;
  }
}

function toEntity(row: ServiceRow): BarberService {
  return BarberService.restore({ id: row.id, name: row.name, price: Number(row.price) });
}

/** `ilike` treats `%` and `_` as wildcards; escape them so the name matches literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
