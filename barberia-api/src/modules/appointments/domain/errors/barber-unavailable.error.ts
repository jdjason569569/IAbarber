import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The barber blocked the requested time (see the day blocks in business hours). */
export class BarberUnavailableError extends DomainError {}
