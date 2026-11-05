import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The image provider refused for quota (Gemini free tier allows 0 images, or the daily limit was reached). */
export class ImageQuotaExceededError extends DomainError {}
