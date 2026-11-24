import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The chosen date and time is not among the free slots offered on the web. */
export class SlotUnavailableError extends DomainError {}
