const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * `2026-11-26` -> "jueves 26 de noviembre del 2026": how the assistant says a date, so the phone's
 * voice never reads the digits one by one.
 */
export function spokenDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  // Noon UTC: the weekday of the calendar date, whatever the time zone.
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  return `${WEEKDAYS[weekday]} ${day} de ${MONTHS[month - 1]} del ${year}`;
}

/** `14:00` -> "2:00 p. m." (12-hour clock, as the barber says it). */
export function clockTime12(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'a. m.' : 'p. m.'}`;
}
