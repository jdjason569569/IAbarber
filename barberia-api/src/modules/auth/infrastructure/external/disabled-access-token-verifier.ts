import { Injectable } from '@nestjs/common';
import type { AccessTokenVerifier } from '../../domain/ports/access-token-verifier.port.js';

/** Used when Supabase is not configured: there is no admin login, only guest mode. */
@Injectable()
export class DisabledAccessTokenVerifier implements AccessTokenVerifier {
  async verify(): Promise<string | null> {
    return null;
  }
}
