import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The service price is not a whole amount between 0 and MAX_SERVICE_PRICE. */
export class InvalidServicePriceError extends DomainError {}
