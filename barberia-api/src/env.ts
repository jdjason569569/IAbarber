import { existsSync } from 'node:fs';

// Must be the first import of main.ts so variables exist before modules read them (restart after editing .env).
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

// Dates and "today" follow the shop's clock, not the server's (Render runs in UTC, so at 9 pm in
// Bogotá it would already be the next day). Node applies a TZ change to every later Date.
process.env.TZ = process.env.SHOP_TIMEZONE || 'America/Bogota';
