import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The private link of a booking is wrong, or the booking does not exist. */
export class InvalidBookingLinkError extends DomainError {}
