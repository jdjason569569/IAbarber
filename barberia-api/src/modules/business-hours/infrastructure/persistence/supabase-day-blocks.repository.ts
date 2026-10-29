import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../../shared/supabase/supabase.provider.js';
import type { TimeBlock } from '../../domain/entities/day-blocks.entity.js';
import type { DayBlocksRepository } from '../../domain/ports/day-blocks.repository.js';

interface UnavailableSlotRow {
  date: string;
  from_hour: number;
  to_hour: number;
}

const TABLE = 'unavailable_slots';

@Injectable()
export class SupabaseDayBlocksRepository implements DayBlocksRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findByDate(date: string): Promise<TimeBlock[]> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('date, from_hour, to_hour')
      .eq('date', date)
      .order('from_hour');
    if (error) throw new Error(error.message);
    return (data as UnavailableSlotRow[]).map((row) => ({ fromHour: row.from_hour, toHour: row.to_hour }));
  }

  async replace(date: string, blocks: TimeBlock[]): Promise<void> {
    const { error: deleteError } = await this.supabase.from(TABLE).delete().eq('date', date);
    if (deleteError) throw new Error(deleteError.message);
    if (blocks.length === 0) return;
    const rows: UnavailableSlotRow[] = blocks.map((b) => ({ date, from_hour: b.fromHour, to_hour: b.toHour }));
    const { error } = await this.supabase.from(TABLE).insert(rows);
    if (error) throw new Error(error.message);
  }
}
