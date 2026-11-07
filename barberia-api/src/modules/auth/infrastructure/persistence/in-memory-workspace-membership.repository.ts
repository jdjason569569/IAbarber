import { Injectable } from '@nestjs/common';
import type { WorkspaceMembershipRepository } from '../../domain/ports/workspace-membership.repository.js';

/** Used when Supabase is not configured: no user belongs to a workspace. */
@Injectable()
export class InMemoryWorkspaceMembershipRepository implements WorkspaceMembershipRepository {
  async findWorkspaceOf(): Promise<string | null> {
    return null;
  }
}
