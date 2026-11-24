import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The booking starts too soon (or is no longer pending) to change it from the web. */
export class TooLateToChangeError extends DomainError {}
