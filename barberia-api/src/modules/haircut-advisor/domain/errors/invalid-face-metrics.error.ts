import { DomainError } from '../../../../shared/errors/domain.error.js';

/** A face metric is missing or is not a plausible ratio. */
export class InvalidFaceMetricsError extends DomainError {}
