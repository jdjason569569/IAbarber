import { Injectable, computed, signal } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/** Who is using the app: the barber (admin, logged in) or a visitor trying the demo. */
export type AppRole = 'admin' | 'guest';

const GUEST_FLAG = 'barberia.guest';

/**
 * Session of the app. The admin logs in with Supabase Auth (email and password) and the API
 * receives the access token; the guest needs no account and the API receives `X-Guest: 1`.
 * Each role sees its own appointments and settings (separated by the API).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey,
  );
  private readonly roleState = signal<AppRole | null>(null);
  /** Resolves once the stored session (if any) was restored. */
  readonly ready: Promise<void>;

  readonly role = this.roleState.asReadonly();
  readonly isGuest = computed(() => this.roleState() === 'guest');

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
    setGuestFlag(false);
    this.roleState.set('admin');
  }

  enterAsGuest(): void {
    setGuestFlag(true);
    this.roleState.set('guest');
  }

  async signOut(): Promise<void> {
    setGuestFlag(false);
    this.roleState.set(null);
    await this.supabase.auth.signOut();
  }

  /** Headers that identify the session to the API (the token is refreshed when needed). */
  async apiHeaders(): Promise<Record<string, string>> {
    const role = this.roleState();
    if (role === 'guest') return { 'X-Guest': '1' };
    if (role === 'admin') {
      const { data } = await this.supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  private async restore(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    if (data.session) {
      this.roleState.set('admin');
    } else if (readGuestFlag()) {
      this.roleState.set('guest');
    }
  }
}

function readGuestFlag(): boolean {
  try {
    return localStorage.getItem(GUEST_FLAG) === '1';
  } catch {
    return false;
  }
}

function setGuestFlag(on: boolean): void {
  try {
    if (on) localStorage.setItem(GUEST_FLAG, '1');
    else localStorage.removeItem(GUEST_FLAG);
  } catch {
    // Storage unavailable: the guest session only lasts until the app is closed.
  }
}
