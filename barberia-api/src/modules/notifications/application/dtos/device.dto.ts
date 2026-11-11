export interface RegisterDeviceInput {
  token: string;
  platform: string;
}

export interface NewBookingInput {
  client: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** `HH:mm`. */
  time: string;
}

export interface BookingChangeInput {
  kind: 'cancelled' | 'rescheduled';
  client: string;
  /** `YYYY-MM-DD`: the cancelled date, or the new one when rescheduled. */
  date: string;
  /** `HH:mm`: the cancelled time, or the new one when rescheduled. */
  time: string;
}
