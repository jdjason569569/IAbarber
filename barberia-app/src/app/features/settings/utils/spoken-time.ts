export type Meridiem = 'am' | 'pm' | 'night';

/** An hour as the barber said it: "3", "3:30", "3 y media", "3 de la tarde". */
export interface SpokenTime {
  hour: number;
  minutes: number;
  meridiem?: Meridiem;
}

const NUMBER_WORDS: Record<string, string> = {
  una: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6',
  siete: '7', ocho: '8', nueve: '9', diez: '10', once: '11', doce: '12',
};

/** A time: "3", "3:30", "15h", "3 y media", "3 pm", "3 de la tarde". */
const TIME =
  /\b(\d{1,2})(?:[:.](\d{2}))?(?:\s*h(?:oras?)?\b)?(\s*y\s*media)?(?:\s*(a\.?\s?m\b\.?|p\.?\s?m\b\.?|de la manana|de la tarde|de la noche|del mediodia))?/g;

/**
 * Lower case, no accents, "mediodía"/"medianoche" as hours and the number words that follow a word
 * introducing an hour ("a las dos") as digits, so "tengo una cita" is not read as 1:00.
 */
export function normalizeSpoken(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(medio ?dia)\b/g, '12 del mediodia')
    .replace(/\b(media ?noche)\b/g, '12 de la noche')
    .replace(
      /\b(la|las|a|al|de|desde|hasta|entre|y)\s+(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b/g,
      (_, before: string, word: string) => `${before} ${NUMBER_WORDS[word]}`,
    );
}

/** Every time said in an already normalized text, in order. */
export function spokenTimes(normalized: string): SpokenTime[] {
  return [...normalized.matchAll(TIME)].map(toSpokenTime).filter((t) => t.hour <= 24);
}

function toSpokenTime(match: RegExpMatchArray): SpokenTime {
  const minutes = match[3] ? 30 : Number(match[2] ?? 0);
  return { hour: Number(match[1]), minutes, meridiem: toMeridiem(match[4]) };
}

function toMeridiem(word: string | undefined): Meridiem | undefined {
  if (!word) return undefined;
  if (word.startsWith('a') || word === 'de la manana') return 'am';
  if (word === 'de la noche') return 'night';
  return 'pm';
}

/** Every 24-hour reading of a spoken time: "4" may be 4 or 16; "4 pm" is only 16. */
export function readings(time: SpokenTime): number[] {
  const { hour, meridiem } = time;
  if (hour > 12) return [hour];
  if (meridiem === 'am') return [hour === 12 ? 0 : hour];
  if (meridiem === 'night') return [hour === 12 ? 24 : hour + 12];
  if (meridiem === 'pm') return [hour === 12 ? 12 : hour + 12];
  return hour === 12 ? [12] : [hour, hour + 12];
}

/** End of a range: the first reading after `fromHour`; "4:30" ends at 5 (ranges are whole hours). */
export function endHour(time: SpokenTime, fromHour: number): number {
  const options = readings(time).map((h) => (time.minutes > 0 ? h + 1 : h));
  return options.find((h) => h > fromHour) ?? options[options.length - 1];
}
