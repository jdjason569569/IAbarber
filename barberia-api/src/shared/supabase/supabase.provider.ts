import { createClient } from '@supabase/supabase-js';
import type { Provider } from '@nestjs/common';

export const SUPABASE_CLIENT = Symbol('SUPABASE_CLIENT');

export const supabaseProvider: Provider = {
  provide: SUPABASE_CLIENT,
  useFactory: () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    }
    return createClient(url, key, { auth: { persistSession: false } });
  },
};
