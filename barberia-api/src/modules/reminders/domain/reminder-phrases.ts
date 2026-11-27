/**
 * What the barber hears (and reads in the notification) before an appointment: a random Colombian,
 * semi-formal phrase. `{barbero}` is the name from Configuración, `{cliente}` the client and `{n}` the
 * minutes left. Without a name the phrase is said without it ("¡Pilas! En 10 minuticos…").
 */
const TEN_MINUTES = [
  '¡Pilas {barbero}! En {n} minuticos le toca con {cliente}.',
  'Quiubo {barbero}, vaya alistando la silla que {cliente} llega en {n} minutos.',
  '{barbero}, ojo pues: en {n} minutos tiene a {cliente}.',
  'Hágale {barbero}, que en {n} minutos le cae {cliente}.',
  '{barbero}, vaya cuadrando todo, que {cliente} viene en {n} minuticos.',
  'Ey {barbero}, no se me descuide: faltan {n} minutos para {cliente}.',
  '{barbero}, vaya calentando la máquina que en {n} minutos le toca {cliente}.',
  'Atento {barbero}, en {n} minuticos tiene cita con {cliente}.',
];

const FIVE_MINUTES = [
  '¡Pilas {barbero}! Ya casi le toca con {cliente}, faltan {n} minutos.',
  '{barbero}, ya mismo llega {cliente}. Quedan {n} minuticos.',
  'Listo pues {barbero}, en {n} minutos le toca con {cliente}.',
  'Ey {barbero}, vaya terminando que {cliente} está por llegar.',
  '{barbero}, de una: en {n} minutos tiene a {cliente}.',
  'Hágale {barbero}, que ya casi es la hora de {cliente}.',
  '{barbero}, ya está cerquita {cliente}, solo faltan {n} minutos.',
  'Ojo {barbero}, en {n} minuticos le cae {cliente}. ¡A camellar!',
];

/** Phrases of the reminder sent `lead` minutes before (10 → the "vaya alistando" ones, 5 → "ya casi"). */
export function reminderPhrases(lead: number): readonly string[] {
  return lead > 5 ? TEN_MINUTES : FIVE_MINUTES;
}

/** Fills one phrase; `n` is the real minutes left (an appointment booked late may have 3, or 1). */
export function fillReminderPhrase(template: string, barber: string, client: string, minutes: number): string {
  let text = template.replace(/\{cliente\}/g, client).replace(/\{n\}/g, String(minutes));
  if (minutes === 1) {
    text = text
      .replace(/\b1 minuticos\b/g, '1 minutico')
      .replace(/\b1 minutos\b/g, '1 minuto')
      .replace(/\b([Ff]alta|[Qq]ueda)n 1\b/g, '$1 1');
  }
  if (barber) return text.replace(/\{barbero\}/g, barber);
  // No name: "¡Pilas {barbero}!" → "¡Pilas!", "{barbero}, ojo pues" → "Ojo pues".
  text = text.replace(/ \{barbero\}/g, '').replace(/^\{barbero\}, /, '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
