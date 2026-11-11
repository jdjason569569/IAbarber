/**
 * What a client wants: book, talk with the barber, or (with a pending booking) cancel it,
 * confirm the cancellation, or move it to another time.
 */
export type ClientChoiceKind = 'book' | 'talk' | 'cancel' | 'confirmCancel' | 'reschedule';

const MENU_OPTIONS: Record<string, ClientChoiceKind> = { '1': 'book', '2': 'talk', '3': 'cancel', '4': 'reschedule' };

/** Words that mean "I want a person", e.g. "quiero hablar con el barbero". */
const TALK_WORDS = new Set(['barbero', 'hablar', 'humano', 'persona', 'asesor', 'llamar', 'llamada']);
/** Words that mean "cancel my booking", e.g. "quiero cancelar mi cita". */
const CANCEL_WORDS = new Set(['cancelar', 'cancela', 'cancelo', 'anular', 'anula']);
/** Words that mean "move my booking", e.g. "quiero cambiar la hora". */
const RESCHEDULE_WORDS = new Set(['cambiar', 'cambio', 'cambia', 'reagendar', 'mover', 'muevo', 'reprogramar']);
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

/** The client's answer to the menu: a number alone, or words that say what they want. */
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
    // "SI CANCELAR" (also "sí, cancelar") is the answer to the bot's confirmation question.
    if (tokens.length === 2 && tokens[0] === 'si' && tokens[1] === 'cancelar') {
      return new ClientChoice('confirmCancel', false);
    }
    // Talking wins: "quiero hablar con el barbero de una cita" is a request for a person.
    // Cancelling and moving win over booking: "quiero cancelar mi cita" mentions "cita" too.
    if (tokens.some((t) => TALK_WORDS.has(t))) return new ClientChoice('talk', false);
    if (tokens.some((t) => CANCEL_WORDS.has(t))) return new ClientChoice('cancel', false);
    if (tokens.some((t) => RESCHEDULE_WORDS.has(t))) return new ClientChoice('reschedule', false);
    if (tokens.some((t) => BOOK_WORDS.has(t))) return new ClientChoice('book', false);
    return new ClientChoice(undefined, false);
  }
}
