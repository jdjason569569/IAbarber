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
  status: 'asking' | 'created' | 'cancelled';
  /** Listening window for the next answer; the app default applies when absent. */
  listenSeconds?: number;
}
