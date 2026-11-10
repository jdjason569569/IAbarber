import { Injectable } from '@nestjs/common';
import type { AccessTokenVerifier } from '../../domain/ports/access-token-verifier.port.js';

/** Used when Supabase is not configured: there is no admin login, so app requests get 401. */
@Injectable()
export class DisabledAccessTokenVerifier implements AccessTokenVerifier {
  async verify(): Promise<string | null> {
    return null;
  }
}
