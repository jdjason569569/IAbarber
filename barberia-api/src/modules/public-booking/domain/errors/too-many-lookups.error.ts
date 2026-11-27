import { DomainError } from '../../../../shared/errors/domain.error.js';

/** Too many attempts to find a booking from one IP: stops guessing phones and names. */
export class TooManyLookupsError extends DomainError {}
