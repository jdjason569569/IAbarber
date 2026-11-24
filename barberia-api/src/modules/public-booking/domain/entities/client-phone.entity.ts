import { InvalidWebBookingError } from '../errors/invalid-web-booking.error.js';

const COLOMBIA = '57';

/**
 * Client phone as stored for WhatsApp bookings: international format, digits only (573001234567).
 * The page asks for a Colombian mobile: 10 digits starting with 3, with or without the 57 prefix.
 */
export class ClientPhone {
  private constructor(readonly value: string) {}

  static parse(raw: string): ClientPhone {
    let digits = raw.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith(COLOMBIA)) {
      digits = digits.slice(COLOMBIA.length);
    }
    if (!/^3\d{9}$/.test(digits)) {
      throw new InvalidWebBookingError('phone', `Invalid phone: ${raw}`);
    }
    return new ClientPhone(`${COLOMBIA}${digits}`);
  }
}
