import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The shop is closed on the requested day or at the requested time. */
export class OutsideBusinessHoursError extends DomainError {}
