/**
 * `HH:mm` as said aloud in Colombian Spanish, for the phone's voice:
 * "15:00" -> "a las 3 de la tarde", "09:30" -> "a las 9 y media de la mañana", "13:15" -> "a la 1 y 15 de la tarde".
 */
export function spokenTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const article = hour12 === 1 ? 'a la' : 'a las';
  const part = hours < 12 ? 'de la mañana' : hours < 19 ? 'de la tarde' : 'de la noche';
  const rest = minutes === 0 ? '' : minutes === 30 ? ' y media' : ` y ${minutes}`;
  return `${article} ${hour12}${rest} ${part}`;
}
