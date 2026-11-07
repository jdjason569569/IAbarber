export const ACCESS_TOKEN_VERIFIER = Symbol('ACCESS_TOKEN_VERIFIER');

/** Checks a login token issued to an admin and tells which user it belongs to. */
export interface AccessTokenVerifier {
  /** User id of a valid token; null when the token is invalid or expired. */
  verify(token: string): Promise<string | null>;
}
