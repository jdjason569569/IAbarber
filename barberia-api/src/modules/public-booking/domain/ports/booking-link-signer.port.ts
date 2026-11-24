export const BOOKING_LINK_SIGNER = Symbol('BOOKING_LINK_SIGNER');

/**
 * Token of the private link a client gets after booking on the web. It is derived from the booking
 * id, so nothing is stored: whoever has the link can see, move or cancel that booking only.
 */
export interface BookingLinkSigner {
  sign(appointmentId: number): string;
  verify(appointmentId: number, token: string): boolean;
}
