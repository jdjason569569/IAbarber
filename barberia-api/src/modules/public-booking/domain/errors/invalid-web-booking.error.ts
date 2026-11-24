import { DomainError } from '../../../../shared/errors/domain.error.js';

export type WebBookingField = 'name' | 'phone' | 'date';

/** A field the client typed on the booking page is not valid. */
export class InvalidWebBookingError extends DomainError {
  constructor(
    readonly field: WebBookingField,
    message: string,
  ) {
    super(message);
  }
}
