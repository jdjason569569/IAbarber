/** Day a WhatsApp client may book: only the two days the greeting lists. */
export type BookingDay = 'today' | 'tomorrow';

/** Matches outside letters and digits, so "mañana" and "15h" are whole tokens (\b ignores ñ and accents). */
const BEFORE = '(?<![\\p{L}\\d])';
const AFTER = '(?![\\p{L}\\d])';

const DAY_PART = new RegExp(`${BEFORE}(?:de|en|por)\\s+la\\s+(ma[nñ]ana|tarde|noche|madrugada)${AFTER}`, 'iu');
const DAY = new RegExp(`${BEFORE}(hoy|ma[nñ]ana)${AFTER}`, 'iu');
const TIME = new RegExp(
  `${BEFORE}(\\d{1,2})(?::(\\d{2})|h(\\d{2})?)?\\s*(?:(a|p)\\.?\\s?m\\.?)?${AFTER}`,
  'iu',
);

/** Words around the name in messages like "hola, soy Juan, quiero una cita a las 3". */
const FILLER_WORDS = new Set([
  'a', 'al', 'agendar', 'agenda', 'barbero', 'buenas', 'buenos', 'cita', 'con', 'de', 'del', 'dias', 'el', 'en', 'es',
  'favor', 'gracias', 'hola', 'hora', 'horas', 'la', 'las', 'llamo', 'me', 'mi', 'nombre', 'noches', 'ok',
  'para', 'por', 'porfa', 'quiero', 'reservar', 'si', 'soy', 'tardes', 'turno', 'un', 'una', 'y',
]);

const MAX_NAME_LENGTH = 60;

function normalize(word: string): string {
  return word.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function capitalize(word: string): string {
  return word.charAt(0).toLocaleUpperCase('es') + word.slice(1).toLocaleLowerCase('es');
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** What a client wrote to book: "Juan Pérez mañana 15:00", "soy Ana, hoy a las 3 de la tarde"... */
export class BookingMessage {
  private constructor(
    readonly client: string | undefined,
    readonly day: BookingDay | undefined,
    private readonly hour: number | undefined,
    private readonly minute: number,
    private readonly meridiem: 'am' | 'pm' | undefined,
  ) {}

  static parse(text: string): BookingMessage {
    let rest = text;
    const take = (pattern: RegExp): RegExpMatchArray | null => {
      const match = rest.match(pattern);
      if (match) rest = rest.replace(match[0], ' ');
      return match;
    };

    // "de la mañana" first, so that "mañana" alone is left as the day.
    const dayPart = take(DAY_PART);
    let meridiem: 'am' | 'pm' | undefined;
    if (dayPart) meridiem = /tarde|noche/i.test(dayPart[1]) ? 'pm' : 'am';

    const dayMatch = take(DAY);
    const day: BookingDay | undefined = dayMatch
      ? normalize(dayMatch[1]) === 'hoy' ? 'today' : 'tomorrow'
      : undefined;

    let hour: number | undefined;
    let minute = 0;
    const timeMatch = take(TIME);
    if (timeMatch) {
      const h = Number(timeMatch[1]);
      const m = Number(timeMatch[2] ?? timeMatch[3] ?? 0);
      if (h <= 23 && m <= 59) {
        hour = h;
        minute = m;
        if (timeMatch[4]) meridiem = timeMatch[4].toLowerCase() === 'p' ? 'pm' : 'am';
      }
    }

    const words = rest
      .split(/[^\p{L}'-]+/u)
      .filter((w) => /\p{L}/u.test(w) && !FILLER_WORDS.has(normalize(w)));
    const client = words.map(capitalize).join(' ').slice(0, MAX_NAME_LENGTH).trim() || undefined;

    return new BookingMessage(client, day, hour, minute, meridiem);
  }

  get hasTime(): boolean {
    return this.hour !== undefined;
  }

  /**
   * An hour from 1 to 11 with no am/pm and no "de la mañana/tarde/noche" ("mañana 7:00") could be
   * morning or evening, so the client must say which before booking. 12 and 13-23 are clear.
   */
  get needsDayPart(): boolean {
    return this.hour !== undefined && this.meridiem === undefined && this.hour >= 1 && this.hour <= 11;
  }

  /** The time as the client wrote it, without am/pm: "7" or "7:30". */
  get clock(): string | undefined {
    if (this.hour === undefined) return undefined;
    return this.minute ? `${this.hour}:${pad(this.minute)}` : String(this.hour);
  }

  /**
   * `HH:mm` times the client may mean, most likely first. Without am/pm a morning hour is
   * ambiguous ("a las 3"), so both readings are returned.
   */
  get candidateTimes(): string[] {
    if (this.hour === undefined) return [];
    const minute = pad(this.minute);
    if (this.meridiem === 'pm') return [`${pad(this.hour < 12 ? this.hour + 12 : this.hour)}:${minute}`];
    if (this.meridiem === 'am') return [`${pad(this.hour === 12 ? 0 : this.hour)}:${minute}`];
    const times = [`${pad(this.hour)}:${minute}`];
    if (this.hour >= 1 && this.hour < 12) times.push(`${pad(this.hour + 12)}:${minute}`);
    return times;
  }
}
