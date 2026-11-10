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

export interface TalkRequestInput {
  /** WhatsApp display name, when known. */
  client?: string;
  /** Phone without "+", when known. */
  phone?: string;
}
