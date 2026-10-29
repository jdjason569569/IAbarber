export interface BookingDraft {
  client?: string;
  date?: string;
  time?: string;
  service?: string;
  /** Client served right now without a booking: the assistant only asks for the service. */
  walkIn?: boolean;
}

export interface BookingTurnResult {
  reply: string;
  draft: BookingDraft;
  status: 'asking' | 'created' | 'cancelled';
  /** Listening window for the next answer; the app default applies when absent. */
  listenSeconds?: number;
}
