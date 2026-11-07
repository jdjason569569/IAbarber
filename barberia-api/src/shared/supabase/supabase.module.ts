import { Global, Module } from '@nestjs/common';
import { isSupabaseConfigured, supabaseProvider } from './supabase.provider.js';

/** One Supabase client for the whole API; only registered when the credentials are configured. */
@Global()
@Module({
  providers: isSupabaseConfigured ? [supabaseProvider] : [],
  exports: isSupabaseConfigured ? [supabaseProvider] : [],
})
export class SupabaseModule {}
