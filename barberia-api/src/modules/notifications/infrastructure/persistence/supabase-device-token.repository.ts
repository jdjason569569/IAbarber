import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../../shared/supabase/supabase.provider.js';
import type { DeviceTokenRepository } from '../../domain/ports/device-token.repository.js';

interface DeviceTokenRow {
  token: string;
}

/** Table created by docs/migrations/002_device_tokens.sql. */
const TABLE = 'device_tokens';

@Injectable()
export class SupabaseDeviceTokenRepository implements DeviceTokenRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async save(token: string, workspaceId: string, platform: string): Promise<void> {
    const { error } = await this.supabase
      .from(TABLE)
      .upsert(
        { token, workspace_id: workspaceId, platform, updated_at: new Date().toISOString() },
        { onConflict: 'token' },
      );
    if (error) throw new Error(error.message);
  }

  async remove(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    const { error } = await this.supabase.from(TABLE).delete().in('token', tokens);
    if (error) throw new Error(error.message);
  }

  async findByWorkspace(workspaceId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('token')
      .eq('workspace_id', workspaceId);
    if (error) throw new Error(error.message);
    return (data as DeviceTokenRow[]).map((row) => row.token);
  }
}
