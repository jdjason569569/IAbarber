import { Inject, Injectable } from '@nestjs/common';
import { BookingName } from '../../domain/entities/booking-name.entity.js';
import { ClientPhone } from '../../domain/entities/client-phone.entity.js';
import { NoBookingFoundError } from '../../domain/errors/no-booking-found.error.js';
import { TooManyLookupsError } from '../../domain/errors/too-many-lookups.error.js';
import { WEB_BOOKING_LOOKUPS } from '../../domain/ports/web-booking-activity.port.js';
import type { WebBookingActivity } from '../../domain/ports/web-booking-activity.port.js';
import type { BookFromWebResult, FindWebBookingsInput } from '../dtos/web-booking.dto.js';
import { WebBookingAccess, isPending, startOf } from '../web-booking-access.js';

/** Attempts to find a booking per IP in the last hour. */
const MAX_LOOKUPS_PER_IP_PER_HOUR = 10;
const HOUR_MS = 60 * 60_000;

/**
 * A client who lost the private link finds their upcoming bookings again with the phone and the
 * first name they booked with (accents and case do not matter). The name is asked so that knowing
 * a phone number alone is not enough to cancel someone else's booking.
 */
@Injectable()
export class FindWebBookingsUseCase {
  constructor(
    private readonly access: WebBookingAccess,
    @Inject(WEB_BOOKING_LOOKUPS) private readonly lookups: WebBookingActivity,
  ) {}

  async execute(input: FindWebBookingsInput): Promise<BookFromWebResult[]> {
    const now = Date.now();
    if ((await this.lookups.countSince(input.ip, now - HOUR_MS)) >= MAX_LOOKUPS_PER_IP_PER_HOUR) {
      throw new TooManyLookupsError('Too many booking lookups from this IP');
    }
    await this.lookups.record(input.ip, now);

    const phone = ClientPhone.parse(input.phone);
    const firstName = firstWord(BookingName.parse(input.name).value);
    const found = (await this.access.all())
      .filter((a) => a.phone === phone.value && isPending(a) && startOf(a) > now && firstWord(a.client) === firstName)
      .sort((a, b) => startOf(a) - startOf(b));
    if (found.length === 0) {
      throw new NoBookingFoundError('No upcoming booking for that phone and name');
    }
    return Promise.all(found.map(async (a) => ({ booking: await this.access.toDto(a), token: this.access.sign(a.id) })));
  }
}

/** "José Luis" → "jose". */
function firstWord(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)[0];
}
