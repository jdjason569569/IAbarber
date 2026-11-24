import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The booking was already moved the allowed number of times. */
export class RescheduleLimitError extends DomainError {}
