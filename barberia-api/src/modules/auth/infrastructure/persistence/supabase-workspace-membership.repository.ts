import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../../shared/supabase/supabase.provider.js';
import type { WorkspaceMembershipRepository } from '../../domain/ports/workspace-membership.repository.js';

interface WorkspaceMemberRow {
  workspace_id: string;
}

const TABLE = 'workspace_members';

@Injectable()
export class SupabaseWorkspaceMembershipRepository implements WorkspaceMembershipRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async findWorkspaceOf(userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? (data as WorkspaceMemberRow).workspace_id : null;
  }
}
