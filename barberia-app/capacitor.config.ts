import type { CapacitorConfig } from '@capacitor/cli';

// Development builds call the local API over plain HTTP (http://localhost:3000 through `adb reverse`),
// which Android blocks unless the WebView also runs on http and cleartext traffic is allowed.
// Release builds (Render over HTTPS) leave it off. Set CAP_ENV=development when syncing a dev build.
const isDevelopment = process.env['CAP_ENV'] === 'development';

const config: CapacitorConfig = {
  appId: 'com.ia.barberia.app',
  appName: 'barberia-app',
  webDir: 'www',
  ...(isDevelopment ? { server: { androidScheme: 'http', cleartext: true } } : {}),
};

export default config;
