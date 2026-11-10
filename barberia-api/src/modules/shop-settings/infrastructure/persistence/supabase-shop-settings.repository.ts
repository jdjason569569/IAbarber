import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../../shared/supabase/supabase.provider.js';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import type { ShopSettingsRepository } from '../../domain/ports/shop-settings.repository.js';

/** Table created by docs/migrations/004_shop_settings.sql. */
const TABLE = 'shop_settings';

@Injectable()
export class SupabaseShopSettingsRepository implements ShopSettingsRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async getServicePrice(): Promise<number> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('service_price')
      .eq('workspace_id', WorkspaceContext.currentId())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? Number((data as { service_price: string | number }).service_price) : 0;
  }

  async saveServicePrice(price: number): Promise<void> {
    const { error } = await this.supabase.from(TABLE).upsert(
      { workspace_id: WorkspaceContext.currentId(), service_price: price, updated_at: new Date().toISOString() },
      { onConflict: 'workspace_id' },
    );
    if (error) throw new Error(error.message);
  }
}
