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
