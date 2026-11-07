import { DomainError } from '../../../../shared/errors/domain.error.js';

/** The user logged in correctly but is not a member of any workspace. */
export class NoWorkspaceError extends DomainError {}
