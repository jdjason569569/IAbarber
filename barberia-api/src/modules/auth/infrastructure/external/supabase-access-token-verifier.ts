import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../../shared/supabase/supabase.provider.js';
import type { AccessTokenVerifier } from '../../domain/ports/access-token-verifier.port.js';

/** Verifies Supabase Auth access tokens (the admin logs in with email and password in the app). */
@Injectable()
export class SupabaseAccessTokenVerifier implements AccessTokenVerifier {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async verify(token: string): Promise<string | null> {
    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  }
}
