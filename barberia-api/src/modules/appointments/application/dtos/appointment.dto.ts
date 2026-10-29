import type { AppointmentExtra } from '../../domain/entities/appointment.entity.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';

export interface AppointmentDto {
  id: number;
  client: string;
  date: string;
  time: string;
  serviceCost: number;
  extras: AppointmentExtra[];
  cancelled: boolean;
  walkIn: boolean;
  completed: boolean;
}

export interface ScheduleAppointmentInput {
  client: string;
  date: string;
  time: string;
  serviceCost: number;
  extras: AppointmentExtra[];
}

export interface WalkInInput {
  serviceCost: number;
}

export interface WalkInResult {
  appointment: AppointmentDto;
  /** Bookings moved WALK_IN_MINUTES later, in agenda order, with their new time. */
  shifted: AppointmentDto[];
  /** Moved bookings that now fall outside business hours or inside a block of the barber. */
  unavailable: AppointmentDto[];
  /** Bookings that could not be moved (past midnight or the new time was taken). */
  notMoved: AppointmentDto[];
}

export function toAppointmentDto(a: Appointment): AppointmentDto {
  return {
    id: a.id,
    client: a.client,
    date: a.date,
    time: a.time,
    serviceCost: a.serviceCost,
    extras: a.extras,
    cancelled: a.cancelled,
    walkIn: a.walkIn,
    completed: a.completed,
  };
}
