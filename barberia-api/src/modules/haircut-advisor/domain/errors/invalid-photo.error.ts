import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The photo is not a base64 JPEG, PNG or WebP data URL, or it is too big. */
export class InvalidPhotoError extends DomainError {}
