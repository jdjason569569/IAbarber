import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../../shared/supabase/supabase.provider.js';
import { Appointment, UNSAVED_APPOINTMENT_ID } from '../../domain/entities/appointment.entity.js';
import type { AppointmentExtra } from '../../domain/entities/appointment.entity.js';
import { AppointmentConflictError } from '../../domain/errors/appointment-conflict.error.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';

interface AppointmentRow {
  id: number;
  client: string;
  date: string;
  time: string;
  service_cost: number;
  extras: AppointmentExtra[] | null;
  cancelled: boolean;
  walk_in: boolean;
  completed: boolean;
}

const TABLE = 'appointments';
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class SupabaseAppointmentRepository implements AppointmentRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findAll(): Promise<Appointment[]> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    if (error) throw new Error(error.message);
    return (data as AppointmentRow[]).map(toEntity);
  }

  async findById(id: number): Promise<Appointment | null> {
    const { data, error } = await this.supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toEntity(data as AppointmentRow) : null;
  }

  async findActiveAt(date: string, time: string): Promise<Appointment | null> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('*')
      .eq('date', date)
      .eq('time', time)
      .eq('cancelled', false)
      .eq('walk_in', false)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toEntity(data as AppointmentRow) : null;
  }

  async save(appointment: Appointment): Promise<Appointment> {
    const row = {
      client: appointment.client,
      date: appointment.date,
      time: appointment.time,
      service_cost: appointment.serviceCost,
      extras: appointment.extras,
      cancelled: appointment.cancelled,
      walk_in: appointment.walkIn,
      completed: appointment.completed,
    };
    const query =
      appointment.id === UNSAVED_APPOINTMENT_ID
        ? this.supabase.from(TABLE).insert(row)
        : this.supabase.from(TABLE).update(row).eq('id', appointment.id);
    const { data, error } = await query.select().single();
    if (error) {
      // 23505 = unique violation: the partial index on (date, time) caught a concurrent booking.
      if (error.code === UNIQUE_VIOLATION) {
        throw new AppointmentConflictError('That date and time is already booked');
      }
      throw new Error(error.message);
    }
    return toEntity(data as AppointmentRow);
  }
}

function toEntity(row: AppointmentRow): Appointment {
  return Appointment.restore({
    id: row.id,
    client: row.client,
    date: row.date,
    time: row.time.slice(0, 5),
    serviceCost: Number(row.service_cost),
    extras: row.extras ?? [],
    cancelled: row.cancelled,
    walkIn: row.walk_in ?? false,
    completed: row.completed ?? false,
  });
}
