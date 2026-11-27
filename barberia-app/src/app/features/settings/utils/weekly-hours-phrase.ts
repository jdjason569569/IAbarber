import { DayHours } from '../models/business-hours.model';
import { SpokenTime, endHour, normalizeSpoken, readings, spokenTimes } from './spoken-time';

/** Weekdays from Monday, the order the barber says them in. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** A day name or a set of days: "lunes", "sábados", "entre semana", "todos los días". */
const DAYS =
  /\b(todos los dias|toda la semana|entre semana|fines? de semana|lunes|martes|miercoles|jueves|viernes|sabados?|domingos?)\b/g;

const DAY_NUMBERS: Record<string, number> = {
  lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, sabados: 6, domingo: 0, domingos: 0,
};

/** Only joins day names: "lunes, martes y jueves", "lunes a viernes", "lunes al viernes". */
const CONNECTOR = /^[\s,]*(?:(?:y|e|a|al|hasta|el|los|-)[\s,]*)*$/;
const RANGE = /\b(a|al|hasta)\b|-/;
const CLOSED = /\b(cerrad[oa]s?|cierro todo el dia|no (abro|trabajo|atiendo)|descans[oa]|libres?)\b/;

/** What one schedule phrase changes on a day. */
type Change = { open: false } | { open: true; openHour?: number; closeHour?: number };

interface DayGroup {
  weekdays: number[];
  schedule: string;
}

export interface WeeklyHoursChange {
  /** The whole week with the changes applied. */
  week: DayHours[];
  /** Weekdays whose hours changed or were confirmed, Monday first. */
  changed: number[];
}

/**
 * Reads the opening hours the barber said, e.g. "de lunes a viernes de 8 a 6, el sábado de 9 a 2 y
 * el domingo cerrado", and applies them to `week`. Hours without am/pm are read the way a shop opens:
 * the opening is in the morning unless it is before 6 ("de 2 a 8" is 14:00–20:00) and the closing is
 * the first reading after it. Without day names the hours apply to every day. Returns null when
 * a part cannot be read, so the assistant asks again instead of saving half of it.
 */
export function parseWeeklyHours(text: string, week: DayHours[]): WeeklyHoursChange | null {
  const normalized = normalizeSpoken(text);
  const groups = dayGroups(normalized);
  const updated = week.map((d) => ({ ...d }));
  const changed = new Set<number>();

  for (const group of groups) {
    for (const weekday of group.weekdays) {
      const day = updated.find((d) => d.weekday === weekday);
      if (!day) return null;
      const change = parseSchedule(group.schedule, day);
      if (!change || !apply(day, change)) return null;
      changed.add(weekday);
    }
  }
  if (changed.size === 0) return null;
  return { week: updated, changed: WEEK_ORDER.filter((d) => changed.has(d)) };
}

/** Splits the phrase into the days said together and the hours said right after them. */
function dayGroups(text: string): DayGroup[] {
  const matches = [...text.matchAll(DAYS)];
  if (matches.length === 0) {
    return spokenTimes(text).length > 0 ? [{ weekdays: [...WEEK_ORDER], schedule: text }] : [];
  }

  const groups: DayGroup[] = [];
  let current: number[] = [];
  let rangeStart: number | null = null;
  matches.forEach((match, i) => {
    const days = daysOf(match[1]);
    if (rangeStart !== null && days.length === 1) {
      current.push(...range(rangeStart, days[0]).slice(1));
    } else {
      current.push(...days);
    }
    rangeStart = null;

    const end = match.index! + match[0].length;
    const between = text.slice(end, matches[i + 1]?.index ?? text.length);
    if (i + 1 < matches.length && CONNECTOR.test(between)) {
      if (RANGE.test(between) && days.length === 1) rangeStart = days[0];
      return;
    }
    groups.push({ weekdays: unique(current), schedule: between });
    current = [];
  });

  // "abro de 8 a 6 de lunes a viernes": the hours came before the days.
  const prefix = text.slice(0, matches[0].index);
  if (groups.length > 0 && !hasSchedule(groups[0].schedule) && hasSchedule(prefix)) {
    groups[0].schedule = prefix;
  }
  return groups;
}

function daysOf(word: string): number[] {
  if (word === 'todos los dias' || word === 'toda la semana') return [...WEEK_ORDER];
  if (word === 'entre semana') return [1, 2, 3, 4, 5];
  if (word.startsWith('fin')) return [6, 0];
  return [DAY_NUMBERS[word]];
}

/** "viernes a lunes" also works: the days go round the week. */
function range(from: number, to: number): number[] {
  const start = WEEK_ORDER.indexOf(from);
  const days: number[] = [];
  for (let i = 0; i < 7; i++) {
    const day = WEEK_ORDER[(start + i) % 7];
    days.push(day);
    if (day === to) break;
  }
  return days;
}

function unique(days: number[]): number[] {
  return [...new Set(days)];
}

function hasSchedule(text: string): boolean {
  return spokenTimes(text).length > 0 || CLOSED.test(text);
}

function parseSchedule(text: string, day: DayHours): Change | null {
  const times = spokenTimes(text);
  if (times.length === 0) {
    if (CLOSED.test(text)) return { open: false };
    if (/\b(abiert[oa]s?|abro|trabajo)\b/.test(text)) return { open: true };
    return null;
  }

  if (times.length === 1) {
    const [only] = times;
    if (/\b(desde|a partir|abro|abrimos)\b/.test(text)) return { open: true, openHour: openingHour(only) };
    if (/\b(hasta|cierro|cerramos)\b/.test(text)) {
      return { open: true, closeHour: Math.min(endHour(only, day.openHour), 24) };
    }
    return null;
  }

  const [first, second] = times;
  let openHour: number;
  if (!first.meridiem && second.meridiem) {
    // "de 7 a 8 de la noche" opens at 7:00; "de 2 a 8 de la noche" at 14:00: the shop's usual reading
    // when it is before the closing, else the latest one that is.
    const close = endHour(second, 0);
    const candidates = readings(first).filter((h) => h < close);
    if (candidates.length === 0) return null;
    const usual = openingHour(first);
    openHour = candidates.includes(usual) ? usual : Math.max(...candidates);
  } else {
    openHour = openingHour(first);
  }
  return { open: true, openHour, closeHour: Math.min(endHour(second, openHour), 24) };
}

/** Opening hour: "8" is 8:00, but "2" is 14:00 (no barbershop opens at 2 in the morning). */
function openingHour(time: SpokenTime): number {
  const options = readings(time);
  if (options.length === 1) return options[0];
  return time.hour < 6 ? options[1] : options[0];
}

/** Applies the change; false when the hours end before they start ("abro a las 9" closing at 8). */
function apply(day: DayHours, change: Change): boolean {
  if (!change.open) {
    day.open = false;
    return true;
  }
  const openHour = change.openHour ?? day.openHour;
  const closeHour = change.closeHour ?? day.closeHour;
  if (openHour < 0 || openHour > 23 || closeHour <= openHour || closeHour > 24) return false;
  Object.assign(day, { open: true, openHour, closeHour });
  return true;
}
