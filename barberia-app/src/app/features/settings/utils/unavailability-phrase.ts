import { TimeBlock } from '../models/business-hours.model';
import { SpokenTime, endHour, normalizeSpoken, readings, spokenTimes } from './spoken-time';

/** Opening hours of the day the phrase is about; whole hours, `closeHour` 24 = midnight. */
export interface DayWindow {
  openHour: number;
  closeHour: number;
}

/**
 * Reads what the barber said, e.g. "de 2 a 4 de la tarde", "desde las 3", "hasta las 5", "a las 10",
 * "toda la tarde" or "todo el día", and returns the whole hours they will not be available today.
 * Hours without am/pm are taken as the next ones still ahead inside the opening hours ("de 5 a 7" is
 * 17:00–19:00 when the shop opens at 7). Returns null when no hour range can be read.
 */
export function parseUnavailability(text: string, day: DayWindow, nowHour: number): TimeBlock | null {
  const normalized = normalizeSpoken(text);
  const whole = wholePeriod(normalized, day);
  if (whole) return clamp(whole, day);

  const times = spokenTimes(normalized);
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

/** "todo el día", "toda la mañana", "toda la tarde", "toda la noche". */
function wholePeriod(text: string, day: DayWindow): TimeBlock | null {
  if (/\btodo el dia\b/.test(text)) return { fromHour: day.openHour, toHour: day.closeHour };
  if (/\btoda la manana\b/.test(text)) return { fromHour: day.openHour, toHour: 12 };
  if (/\btoda la tarde\b/.test(text)) return { fromHour: 12, toHour: 18 };
  if (/\btoda la noche\b/.test(text)) return { fromHour: 18, toHour: day.closeHour };
  return null;
}

/** Start of the block: the first reading inside the opening hours that is not already past. */
function startHour(time: SpokenTime, day: DayWindow, nowHour: number): number {
  const options = readings(time);
  const inside = options.filter((h) => h >= day.openHour && h < day.closeHour);
  const ahead = inside.filter((h) => h >= nowHour);
  return ahead[0] ?? inside[0] ?? options[options.length - 1];
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
