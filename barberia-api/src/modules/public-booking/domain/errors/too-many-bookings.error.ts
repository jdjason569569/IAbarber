import { DomainError } from '../../../../shared/errors/domain.error.js';

/** Too many web bookings in the last hour (from one IP or in total). */
export class TooManyBookingsError extends DomainError {}
