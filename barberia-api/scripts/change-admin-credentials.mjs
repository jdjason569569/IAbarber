// Changes the email and/or password of the admin (Supabase Auth) without confirmation emails.
// Run from barberia-api/:  node scripts/change-admin-credentials.mjs
// Uses SUPABASE_URL and SUPABASE_SERVICE_KEY from .env. The new values are typed in the terminal
// (the password is hidden) and never stored. Leave a field empty to keep the current value.
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createClient } from '@supabase/supabase-js';

const ADMIN_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
const MIN_PASSWORD_LENGTH = 6;

if (existsSync('.env')) process.loadEnvFile('.env');
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  fail('SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar en barberia-api/.env');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// One reader for every question (several readers would lose the lines already buffered by the first).
const rl = createInterface({ input: process.stdin, output: process.stdout });
const lines = rl[Symbol.asyncIterator]();
let hidden = false;
const writeToOutput = rl._writeToOutput.bind(rl);
// While a password is typed its characters are not echoed.
rl._writeToOutput = (text) => {
  if (!hidden) writeToOutput(text);
};

const userId = await findAdminUserId();
const { data: current, error: getError } = await supabase.auth.admin.getUserById(userId);
if (getError) fail(`No se pudo leer el usuario admin: ${getError.message}`);
console.log(`Admin actual: ${current.user.email}\n(Deja un campo vacío para no cambiarlo.)\n`);

const email = (await ask('Correo nuevo: ')).trim();
const password = await ask('Contraseña nueva: ', true);
if (password) {
  if (password.length < MIN_PASSWORD_LENGTH) fail(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  if ((await ask('Repite la contraseña: ', true)) !== password) fail('Las contraseñas no coinciden.');
}
rl.close();
if (!email && !password) fail('No se cambió nada.');
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('El correo no es válido.');

const changes = {};
if (email) Object.assign(changes, { email, email_confirm: true });
if (password) changes.password = password;
const { data, error } = await supabase.auth.admin.updateUserById(userId, changes);
if (error) fail(`No se pudo actualizar: ${error.message}`);

console.log(`\n✅ Listo. Correo: ${data.user.email}${password ? ' · contraseña cambiada' : ''}`);
console.log('En la app: Ajustes → Cerrar sesión y entra con los datos nuevos.');

async function findAdminUserId() {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', ADMIN_WORKSPACE_ID);
  if (error) fail(`No se pudo leer workspace_members: ${error.message}`);
  if (data.length !== 1) fail(`Se esperaba 1 admin en el workspace y hay ${data.length}.`);
  return data[0].user_id;
}

/** Reads one line; with `hidden` the typed characters are not shown. */
async function ask(question, hide = false) {
  process.stdout.write(question);
  hidden = hide;
  const { value } = await lines.next();
  if (hide) process.stdout.write('\n');
  hidden = false;
  return value ?? '';
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}
