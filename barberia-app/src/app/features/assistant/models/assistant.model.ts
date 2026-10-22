export interface BookingDraft {
  client?: string;
  date?: string;
  time?: string;
  service?: string;
}

export interface BookingTurnResult {
  reply: string;
  draft: BookingDraft;
  status: 'asking' | 'created' | 'cancelled';
}
