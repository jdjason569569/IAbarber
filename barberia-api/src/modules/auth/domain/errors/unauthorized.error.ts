import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The request has no valid credentials (no valid login token). */
export class UnauthorizedError extends DomainError {}
