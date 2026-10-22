import type { AppointmentDto } from '../../../appointments/application/dtos/appointment.dto.js';

export interface BookingDraft {
  client?: string;
  /** ISO date YYYY-MM-DD. */
  date?: string;
  /** 24h time HH:mm. */
  time?: string;
  /** Exact service name from the catalog. */
  service?: string;
}

export type BookingStep = 'client' | 'date' | 'time' | 'service';

export interface BookingTurnInput {
  /** What the user just said; empty on the first turn. */
  text: string;
  draft: BookingDraft;
}

export interface BookingTurnResult {
  reply: string;
  draft: BookingDraft;
  /** `asking` while data is missing; `created` once saved; `cancelled` if the user gave up. */
  status: 'asking' | 'created' | 'cancelled';
  appointment?: AppointmentDto;
}
