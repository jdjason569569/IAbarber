import { existsSync } from 'node:fs';

// Must be the first import of main.ts so variables exist before modules read them (restart after editing .env).
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}
