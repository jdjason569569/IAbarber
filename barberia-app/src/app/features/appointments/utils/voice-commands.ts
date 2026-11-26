/** What the barber can ask with the "Preguntar" button. */
export type VoiceCommand = 'availability' | 'next';

/** Words that clearly ask for free hours ("¿qué horas tengo disponibles?", "¿tengo huecos?"). */
const AVAILABILITY = /\b(disponib\w*|libres?|huecos?|espacios?|desocupad\w*)\b/;
/** Words that ask for the next appointment ("¿qué cita sigue?", "¿cuál es la próxima?"). */
const NEXT = /\b(sigue|siguiente|proxim[ao]s?|toca|viene)\b/;
/** Weak hint, only used when nothing above matched ("¿qué horas tengo?"). */
const HOURS = /\b(horas?|horarios?|agenda)\b/;

/**
 * Reads what the barber said or typed. Returns null when it is not one of the known commands.
 * Accents and case are ignored, so "Próxima" and "proxima" are the same.
 */
export function detectCommand(text: string): VoiceCommand | null {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (AVAILABILITY.test(normalized)) return 'availability';
  if (NEXT.test(normalized)) return 'next';
  if (HOURS.test(normalized)) return 'availability';
  return null;
}
