// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  /** Base URL of the BarberIA API. On a physical device use the machine LAN IP. */
  apiUrl: 'http://localhost:3000',
  /** Supabase Auth (admin login). The publishable key is public; data access goes through the API. */
  supabaseUrl: 'https://bqxglksrrmnrnhuczaso.supabase.co',
  supabaseKey: 'sb_publishable_-CNR5cPC450_5L9cQJHd9Q_OStYtBr3',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
