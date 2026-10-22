import { DomainError } from '../../../../shared/errors/domain.error.js';

/** Another active appointment already uses the requested date and time. */
export class AppointmentConflictError extends DomainError {}
