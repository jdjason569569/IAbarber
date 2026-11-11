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
  phone: string | null;
  /** WhatsApp chat id when booked through the open-wa bot; null otherwise. */
  chatId: string | null;
  /** Times the client moved it to another slot from WhatsApp. */
  rescheduleCount: number;
}

export interface ScheduleAppointmentInput {
  client: string;
  date: string;
  time: string;
  serviceCost: number;
  extras: AppointmentExtra[];
  /** Set when the client booked on WhatsApp through Meta. */
  phone?: string;
  /** Set when the client booked on WhatsApp through the open-wa bot. */
  chatId?: string;
}

export interface UpdateAppointmentInput {
  client: string;
  serviceCost: number;
}

export interface WalkInInput {
  serviceCost: number;
}

/** Start times (`HH:mm`) still free for a booking on one date. */
export interface DaySlotsDto {
  date: string;
  times: string[];
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
    phone: a.phone,
    chatId: a.chatId,
    rescheduleCount: a.rescheduleCount,
  };
}
