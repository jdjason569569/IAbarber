export interface BookingDraft {
  client?: string;
  date?: string;
  time?: string;
  /** Price of the service (pesos). */
  price?: number;
  /** Client served right now without a booking: the assistant only asks for the price. */
  walkIn?: boolean;
}

export type BookingStep = 'client' | 'date' | 'time' | 'price';

/** Raw answer the user gave to each question; the app sends them all in one request. */
export type BookingAnswers = Partial<Record<BookingStep, string>>;

export interface BookingTurnResult {
  reply: string;
  draft: BookingDraft;
  /** `ready`: a preview read every answer and found them valid; nothing is saved yet. */
  status: 'asking' | 'ready' | 'created' | 'cancelled';
  /** Listening window for the next answer; the app default applies when absent. */
  listenSeconds?: number;
  /** The appointment saved, when `status` is `created` (the draft comes back empty then). */
  appointment?: BookedAppointment;
}

/** Appointment as the API returns it after the assistant saves it. */
export interface BookedAppointment {
  client: string;
  date: string;
  time: string;
  serviceCost: number;
  walkIn: boolean;
}
