import { InvalidWebBookingError } from '../errors/invalid-web-booking.error.js';

const MIN_LENGTH = 2;
const MAX_LENGTH = 60;

/** Name the client types on the booking page: 2 to 60 characters, letters required, no links. */
export class BookingName {
  private constructor(readonly value: string) {}

  static parse(raw: string): BookingName {
    const value = raw.replace(/\s+/g, ' ').trim();
    const valid =
      value.length >= MIN_LENGTH &&
      value.length <= MAX_LENGTH &&
      /\p{L}/u.test(value) &&
      !/https?:|www\.|[<>]/i.test(value);
    if (!valid) {
      throw new InvalidWebBookingError('name', `Invalid name: ${raw}`);
    }
    return new BookingName(value);
  }
}
