import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'barberia-app',
  webDir: 'www',
  // Development only: lets the app call the API over plain HTTP on the LAN.
  server: { androidScheme: 'http', cleartext: true },
};

export default config;
