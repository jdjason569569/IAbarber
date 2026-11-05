import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The cut is not in the catalog or is inactive. */
export class HaircutNotFoundError extends DomainError {}
