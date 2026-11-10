import { Inject, Injectable } from '@nestjs/common';
import type { Workspace } from '../../../../shared/workspace/workspace-context.js';
import { NoWorkspaceError } from '../../domain/errors/no-workspace.error.js';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error.js';
import { ACCESS_TOKEN_VERIFIER } from '../../domain/ports/access-token-verifier.port.js';
import type { AccessTokenVerifier } from '../../domain/ports/access-token-verifier.port.js';
import { WORKSPACE_MEMBERSHIP_REPOSITORY } from '../../domain/ports/workspace-membership.repository.js';
import type { WorkspaceMembershipRepository } from '../../domain/ports/workspace-membership.repository.js';

export interface ResolveWorkspaceInput {
  /** Login token of an admin, if any. */
  token?: string;
}

/** Token resolutions are reused for a minute to avoid asking the auth server on every request. */
const CACHE_TTL_MS = 60_000;
const CACHE_LIMIT = 500;

/** Decides which workspace a request works on: an admin token opens the admin's workspace; anything else is rejected. */
@Injectable()
export class ResolveWorkspaceUseCase {
  private readonly cache = new Map<
    string,
    { workspace: Workspace; expiresAt: number }
  >();

  constructor(
    @Inject(ACCESS_TOKEN_VERIFIER) private readonly tokens: AccessTokenVerifier,
    @Inject(WORKSPACE_MEMBERSHIP_REPOSITORY)
    private readonly memberships: WorkspaceMembershipRepository,
  ) {}

  async execute(input: ResolveWorkspaceInput): Promise<Workspace> {
    if (input.token) return this.fromToken(input.token);
    throw new UnauthorizedError('Login required');
  }

  private async fromToken(token: string): Promise<Workspace> {
    const cached = this.cache.get(token);
    if (cached && cached.expiresAt > Date.now()) return cached.workspace;

    const userId = await this.tokens.verify(token);
    if (!userId) throw new UnauthorizedError('Invalid or expired session');
    const workspaceId = await this.memberships.findWorkspaceOf(userId);
    if (!workspaceId) throw new NoWorkspaceError('This user has no workspace');

    const workspace: Workspace = { id: workspaceId, role: 'admin' };
    if (this.cache.size >= CACHE_LIMIT) this.cache.clear();
    this.cache.set(token, { workspace, expiresAt: Date.now() + CACHE_TTL_MS });
    return workspace;
  }
}
