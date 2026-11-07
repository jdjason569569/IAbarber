import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The request has no valid credentials (no login token and not in guest mode). */
export class UnauthorizedError extends DomainError {}
