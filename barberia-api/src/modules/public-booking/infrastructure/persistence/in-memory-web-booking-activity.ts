import { Injectable } from '@nestjs/common';
import type { WebBookingActivity } from '../../domain/ports/web-booking-activity.port.js';

/** Bookings are kept this long; the limits only look at the last hour. */
const KEPT_MS = 2 * 60 * 60_000;

/** In memory: a restart only gives a fresh start to someone who was being limited. */
@Injectable()
export class InMemoryWebBookingActivity implements WebBookingActivity {
  private bookings: { ip: string; at: number }[] = [];

  async countSince(ip: string | null, since: number): Promise<number> {
    return this.bookings.filter((b) => b.at >= since && (ip === null || b.ip === ip)).length;
  }

  async record(ip: string, at: number): Promise<void> {
    this.bookings = this.bookings.filter((b) => b.at > at - KEPT_MS);
    this.bookings.push({ ip, at });
  }
}
