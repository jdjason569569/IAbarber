import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../../shared/supabase/supabase.provider.js';
import type { DayHours } from '../../domain/entities/weekly-hours.entity.js';
import type { BusinessHoursRepository } from '../../domain/ports/business-hours.repository.js';

interface BusinessHoursRow {
  weekday: number;
  is_open: boolean;
  open_hour: number;
  close_hour: number;
}

const TABLE = 'business_hours';

@Injectable()
export class SupabaseBusinessHoursRepository implements BusinessHoursRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findAll(): Promise<DayHours[]> {
    const { data, error } = await this.supabase.from(TABLE).select('*').order('weekday');
    if (error) throw new Error(error.message);
    return (data as BusinessHoursRow[]).map((row) => ({
      weekday: row.weekday,
      open: row.is_open,
      openHour: row.open_hour,
      closeHour: row.close_hour,
    }));
  }

  async saveAll(days: DayHours[]): Promise<void> {
    const rows: BusinessHoursRow[] = days.map((d) => ({
      weekday: d.weekday,
      is_open: d.open,
      open_hour: d.openHour,
      close_hour: d.closeHour,
    }));
    const { error } = await this.supabase.from(TABLE).upsert(rows, { onConflict: 'weekday' });
    if (error) throw new Error(error.message);
  }
}
