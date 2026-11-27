import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The barber's name is longer than MAX_BARBER_NAME_LENGTH. */
export class InvalidBarberNameError extends DomainError {}
