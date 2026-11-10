import { Injectable, signal } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/** Who is using the app: only the barber (admin, logged in). */
export type AppRole = 'admin';

/** Left by older versions that had a guest demo; removed on start. */
const LEGACY_GUEST_FLAG = 'barberia.guest';

/**
 * Session of the app. The admin logs in with Supabase Auth (email and password) and the API
 * receives the access token.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey,
  );
  private readonly roleState = signal<AppRole | null>(null);
  private readonly beforeSignOut: (() => Promise<void>)[] = [];
  /** Resolves once the stored session (if any) was restored. */
  readonly ready: Promise<void>;

  readonly role = this.roleState.asReadonly();

  constructor() {
    this.ready = this.restore();
    // Logout from another tab or an expired refresh token ends the admin session here too.
    this.supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && this.roleState() === 'admin')
        this.roleState.set(null);
    });
  }

  /** Throws when the email or the password is wrong. */
  async signInAdmin(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    this.roleState.set('admin');
  }

  /** Runs before the session ends, while the API still accepts its token (e.g. removing the push token). */
  onBeforeSignOut(hook: () => Promise<void>): void {
    this.beforeSignOut.push(hook);
  }

  async signOut(): Promise<void> {
    await Promise.all(this.beforeSignOut.map((hook) => hook().catch(() => undefined)));
    this.roleState.set(null);
    await this.supabase.auth.signOut();
  }

  /** Ends the session and opens the login with a full reload, so no data of this session stays in memory. */
  async leaveToLogin(): Promise<void> {
    await this.signOut();
    window.location.replace('/login');
  }

  /** Headers that identify the session to the API (the token is refreshed when needed). */
  async apiHeaders(): Promise<Record<string, string>> {
    if (this.roleState() === 'admin') {
      const { data } = await this.supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  private async restore(): Promise<void> {
    removeLegacyGuestFlag();
    const { data } = await this.supabase.auth.getSession();
    if (data.session) this.roleState.set('admin');
  }
}

function removeLegacyGuestFlag(): void {
  try {
    localStorage.removeItem(LEGACY_GUEST_FLAG);
  } catch {
    // Storage unavailable: nothing to clean.
  }
}
