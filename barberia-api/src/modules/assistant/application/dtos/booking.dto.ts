import type { AppointmentDto } from '../../../appointments/application/dtos/appointment.dto.js';

export interface BookingDraft {
  client?: string;
  /** ISO date YYYY-MM-DD. */
  date?: string;
  /** 24h time HH:mm. */
  time?: string;
  /** Price of the service, as the barber says it (pesos). */
  price?: number;
  /** Client served right now without a booking: only the price is asked, the rest is filled in. */
  walkIn?: boolean;
}

export type BookingStep = 'client' | 'date' | 'time' | 'price';

/** Raw answer the user gave to each question, collected by the app before a single request. */
export type BookingAnswers = Partial<Record<BookingStep, string>>;

export interface BookingTurnInput {
  /** What the user just said; empty on the first turn. */
  text: string;
  draft: BookingDraft;
  /** All the answers at once; when present, `text` is ignored. */
  answers?: BookingAnswers;
}

export interface BookingTurnResult {
  reply: string;
  draft: BookingDraft;
  /** `asking` while data is missing; `created` once saved; `cancelled` if the user gave up. */
  status: 'asking' | 'created' | 'cancelled';
  appointment?: AppointmentDto;
  /** Overrides the app's default listening window for the next answer. */
  listenSeconds?: number;
}
