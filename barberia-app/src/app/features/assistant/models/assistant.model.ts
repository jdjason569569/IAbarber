export interface BookingDraft {
  client?: string;
  date?: string;
  time?: string;
  /** Price of the service (pesos). */
  price?: number;
  /** Client served right now without a booking: the assistant only asks for the price. */
  walkIn?: boolean;
}

export interface BookingTurnResult {
  reply: string;
  draft: BookingDraft;
  status: 'asking' | 'created' | 'cancelled';
  /** Listening window for the next answer; the app default applies when absent. */
  listenSeconds?: number;
}
