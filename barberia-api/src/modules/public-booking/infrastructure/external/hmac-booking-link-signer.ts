import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { BookingLinkSigner } from '../../domain/ports/booking-link-signer.port.js';

/** 128 bits of the HMAC, base64url: short enough for a link, too long to guess. */
const TOKEN_BYTES = 16;

/**
 * Signs booking ids with HMAC-SHA256. The key is `BOOKING_LINK_SECRET`; without it, one derived from
 * `SUPABASE_SERVICE_KEY` (also stable and secret). With neither (local development), a random key:
 * links then stop working when the server restarts. Changing the key breaks every link already sent.
 */
@Injectable()
export class HmacBookingLinkSigner implements BookingLinkSigner {
  private readonly key = signingKey();

  sign(appointmentId: number): string {
    return createHmac('sha256', this.key)
      .update(`booking:${appointmentId}`)
      .digest()
      .subarray(0, TOKEN_BYTES)
      .toString('base64url');
  }

  verify(appointmentId: number, token: string): boolean {
    const expected = Buffer.from(this.sign(appointmentId));
    const received = Buffer.from(token);
    return received.length === expected.length && timingSafeEqual(received, expected);
  }
}

function signingKey(): Buffer {
  const secret = process.env.BOOKING_LINK_SECRET?.trim();
  if (secret) return Buffer.from(secret);
  const serviceKey = process.env.SUPABASE_SERVICE_KEY?.trim();
  if (serviceKey) return createHmac('sha256', serviceKey).update('booking-link-secret').digest();
  console.warn('BOOKING_LINK_SECRET is not set: booking links will stop working when the server restarts.');
  return randomBytes(32);
}
