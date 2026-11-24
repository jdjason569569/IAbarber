export const WEB_BOOKING_ACTIVITY = Symbol('WEB_BOOKING_ACTIVITY');

/** Recent web bookings, used to stop someone from filling the agenda from the public page. */
export interface WebBookingActivity {
  /** Bookings since `since` (epoch ms): from that IP, or from everyone when `ip` is null. */
  countSince(ip: string | null, since: number): Promise<number>;
  record(ip: string, at: number): Promise<void>;
}
