import { DomainError } from '../../../../shared/errors/domain.error.js';

/** No upcoming booking matches the phone and name the client typed to find it. */
export class NoBookingFoundError extends DomainError {}
