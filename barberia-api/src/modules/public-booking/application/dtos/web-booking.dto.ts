export interface PublicDaySlotsDto {
  /** `YYYY-MM-DD`. */
  date: string;
  day: 'today' | 'tomorrow';
  /** Free start times (`HH:mm`). */
  times: string[];
}

export interface PublicSlotsDto {
  /** Price of the service set in the app (0 = not set). */
  price: number;
  days: PublicDaySlotsDto[];
}

export interface BookFromWebInput {
  name: string;
  phone: string;
  date: string;
  time: string;
  /** Client IP, for the per-IP limit. */
  ip: string;
}

export interface FindWebBookingsInput {
  name: string;
  phone: string;
  /** Client IP, for the per-IP limit. */
  ip: string;
}

/** What the booking page shows about one booking. The phone is never sent back. */
export interface WebBookingDto {
  id: number;
  client: string;
  date: string;
  time: string;
  price: number;
  status: 'pending' | 'cancelled' | 'completed' | 'past';
  canCancel: boolean;
  canReschedule: boolean;
  /** Free slots to move the booking to; empty when it cannot be moved. */
  slots: PublicDaySlotsDto[];
}

export interface BookFromWebResult {
  booking: WebBookingDto;
  /** Token of the private link: `/reservar/cita/<id>/<token>`. */
  token: string;
}
