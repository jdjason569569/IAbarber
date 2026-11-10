/** What a client wants after the greeting menu: book an appointment or talk with the barber. */
export type ClientChoiceKind = 'book' | 'talk';

const MENU_OPTIONS: Record<string, ClientChoiceKind> = { '1': 'book', '2': 'talk' };

/** Words that mean "I want a person", e.g. "quiero hablar con el barbero". */
const TALK_WORDS = new Set(['barbero', 'hablar', 'humano', 'persona', 'asesor', 'llamar', 'llamada']);
/** Words that mean "I want to book", e.g. "quiero una cita". */
const BOOK_WORDS = new Set(['agendar', 'agenda', 'cita', 'citas', 'reservar', 'reserva', 'turno', 'horario', 'horarios']);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^\p{L}\d]+/u)
    .filter(Boolean);
}

/** The client's answer to the menu: "1" / "2" alone, or words that say what they want. */
export class ClientChoice {
  private constructor(
    readonly kind: ClientChoiceKind | undefined,
    /** True when the message is only the menu number ("2", "2.", "2️⃣"), so it is not a time. */
    readonly isMenuNumber: boolean,
  ) {}

  static parse(text: string): ClientChoice {
    const tokens = words(text);
    if (tokens.length === 1 && MENU_OPTIONS[tokens[0]]) {
      return new ClientChoice(MENU_OPTIONS[tokens[0]], true);
    }
    // Talking wins: "quiero hablar con el barbero de una cita" is a request for a person.
    if (tokens.some((t) => TALK_WORDS.has(t))) return new ClientChoice('talk', false);
    if (tokens.some((t) => BOOK_WORDS.has(t))) return new ClientChoice('book', false);
    return new ClientChoice(undefined, false);
  }
}
