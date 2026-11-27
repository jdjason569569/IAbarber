import { TimeBlock } from '../models/business-hours.model';

/** Opening hours of the day the phrase is about; whole hours, `closeHour` 24 = midnight. */
export interface DayWindow {
  openHour: number;
  closeHour: number;
}

type Meridiem = 'am' | 'pm' | 'night';

interface SpokenTime {
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
 * Reads what the barber said, e.g. "de 2 a 4 de la tarde", "desde las 3", "hasta las 5", "a las 10",
 * "toda la tarde" or "todo el día", and returns the whole hours they will not be available today.
 * Hours without am/pm are taken as the next ones still ahead inside the opening hours ("de 5 a 7" is
 * 17:00–19:00 when the shop opens at 7). Returns null when no hour range can be read.
 */
export function parseUnavailability(text: string, day: DayWindow, nowHour: number): TimeBlock | null {
  const normalized = normalize(text);
  const whole = wholePeriod(normalized, day);
  if (whole) return clamp(whole, day);

  const times = [...normalized.matchAll(TIME)].map(toSpokenTime).filter((t) => t.hour <= 24);
  if (times.length === 0) return null;

  if (times.length === 1) {
    const [only] = times;
    if (/\b(desde|a partir)\b/.test(normalized)) {
      return clamp({ fromHour: startHour(only, day, nowHour), toHour: day.closeHour }, day);
    }
    if (/\bhasta\b/.test(normalized)) {
      const fromHour = Math.max(nowHour, day.openHour);
      return clamp({ fromHour, toHour: endHour(only, fromHour) }, day);
    }
    const fromHour = startHour(only, day, nowHour);
    return clamp({ fromHour, toHour: fromHour + 1 }, day);
  }

  const [first, second] = times;
  // "de 2 a 4 de la tarde": the start takes the latest reading that still ends before the end.
  if (!first.meridiem && second.meridiem) {
    const toHour = endHour(second, 0);
    const candidates = readings(first).filter((h) => h < toHour);
    if (candidates.length === 0) return null;
    return clamp({ fromHour: Math.max(...candidates), toHour }, day);
  }
  const fromHour = startHour(first, day, nowHour);
  return clamp({ fromHour, toHour: endHour(second, fromHour) }, day);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(medio ?dia)\b/g, '12 del mediodia')
    .replace(/\b(media ?noche)\b/g, '12 de la noche')
    // Only after a word that introduces an hour, so "tengo una cita" is not read as 1:00.
    .replace(
      /\b(la|las|a|de|desde|hasta|entre|y)\s+(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b/g,
      (_, before: string, word: string) => `${before} ${NUMBER_WORDS[word]}`,
    );
}

/** "todo el día", "toda la mañana", "toda la tarde", "toda la noche". */
function wholePeriod(text: string, day: DayWindow): TimeBlock | null {
  if (/\btodo el dia\b/.test(text)) return { fromHour: day.openHour, toHour: day.closeHour };
  if (/\btoda la manana\b/.test(text)) return { fromHour: day.openHour, toHour: 12 };
  if (/\btoda la tarde\b/.test(text)) return { fromHour: 12, toHour: 18 };
  if (/\btoda la noche\b/.test(text)) return { fromHour: 18, toHour: day.closeHour };
  return null;
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
function readings(time: SpokenTime): number[] {
  const { hour, meridiem } = time;
  if (hour > 12) return [hour];
  if (meridiem === 'am') return [hour === 12 ? 0 : hour];
  if (meridiem === 'night') return [hour === 12 ? 24 : hour + 12];
  if (meridiem === 'pm') return [hour === 12 ? 12 : hour + 12];
  return hour === 12 ? [12] : [hour, hour + 12];
}

/** Start of the block: the first reading inside the opening hours that is not already past. */
function startHour(time: SpokenTime, day: DayWindow, nowHour: number): number {
  const options = readings(time);
  const inside = options.filter((h) => h >= day.openHour && h < day.closeHour);
  const ahead = inside.filter((h) => h >= nowHour);
  return ahead[0] ?? inside[0] ?? options[options.length - 1];
}

/** End of the block: the first reading after the start; "4:30" ends at 5 (blocks are whole hours). */
function endHour(time: SpokenTime, fromHour: number): number {
  const options = readings(time).map((h) => (time.minutes > 0 ? h + 1 : h));
  return options.find((h) => h > fromHour) ?? options[options.length - 1];
}

function clamp(block: TimeBlock, day: DayWindow): TimeBlock | null {
  const fromHour = Math.max(block.fromHour, day.openHour);
  const toHour = Math.min(block.toHour, day.closeHour);
  return fromHour < toHour ? { fromHour, toHour } : null;
}

/** Adds a block to the day's blocks, joining the ones that overlap or touch. */
export function mergeBlock(blocks: TimeBlock[], added: TimeBlock): TimeBlock[] {
  const sorted = [...blocks, added].sort((a, b) => a.fromHour - b.fromHour);
  const merged: TimeBlock[] = [];
  for (const block of sorted) {
    const last = merged[merged.length - 1];
    if (last && block.fromHour <= last.toHour) {
      last.toHour = Math.max(last.toHour, block.toHour);
    } else {
      merged.push({ ...block });
    }
  }
  return merged;
}
