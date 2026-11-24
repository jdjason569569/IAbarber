import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The phone already holds a future booking (one per client, as on WhatsApp). */
export class PendingBookingExistsError extends DomainError {}
