import { Inject, Injectable } from '@nestjs/common';
import type { AppointmentDto, WalkInResult } from '../../../appointments/application/dtos/appointment.dto.js';
import { ListAppointmentsUseCase } from '../../../appointments/application/use-cases/list-appointments.use-case.js';
import {
  RegisterWalkInUseCase,
  WALK_IN_MINUTES,
} from '../../../appointments/application/use-cases/register-walk-in.use-case.js';
import { ScheduleAppointmentUseCase } from '../../../appointments/application/use-cases/schedule-appointment.use-case.js';
import { AppointmentConflictError } from '../../../appointments/domain/errors/appointment-conflict.error.js';
import { AppointmentInPastError } from '../../../appointments/domain/errors/appointment-in-past.error.js';
import { BarberUnavailableError } from '../../../appointments/domain/errors/barber-unavailable.error.js';
import { InvalidAppointmentError } from '../../../appointments/domain/errors/invalid-appointment.error.js';
import { OutsideBusinessHoursError } from '../../../appointments/domain/errors/outside-business-hours.error.js';
import { GetBusinessHoursUseCase } from '../../../business-hours/application/use-cases/get-business-hours.use-case.js';
import { GetDayBlocksUseCase } from '../../../business-hours/application/use-cases/get-day-blocks.use-case.js';
import type { TimeBlock } from '../../../business-hours/domain/entities/day-blocks.entity.js';
import type { DayHours } from '../../../business-hours/domain/entities/weekly-hours.entity.js';
import { localIsoDate } from '../../../../shared/utils/local-date.js';
import { LLM_PORT } from '../../domain/ports/llm.port.js';
import type { LlmPort, LlmTool } from '../../domain/ports/llm.port.js';
import type {
  BookingAnswers,
  BookingDraft,
  BookingStep,
  BookingTurnInput,
  BookingTurnResult,
} from '../dtos/booking.dto.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Shorter listening window when the user must repeat a rejected answer. */
const RETRY_LISTEN_SECONDS = 7;

const PAST_REPLY = 'Esa fecha ya pasó, no se puede agendar una cita en el pasado.';

const CLOSED_DAY_REPLY = 'Ese día no atendemos. ¿Para qué otra fecha?';

const PRICE_HINT = "The price is a number in pesos: 'quince mil' -> 15000, '20 mil' -> 20000, 'doce mil quinientos' -> 12500.";

/**
 * The barbershop is noisy (music, clippers, other people talking), so the speech recognizer often
 * mixes the barber's answer with background speech.
 */
const NOISE_HINT = [
  'Answers come from a speech recognizer in a noisy barbershop and may contain background speech, music lyrics or unrelated phrases mixed in.',
  'Extract only the part that answers the question and ignore the rest. Example: "a las tres pásame la toalla y media" -> time 15:30.',
  'The client is only a person\'s name (first name and maybe surnames): drop any other words around it. Example: "Carlos Gómez oye bájale a la música" -> "Carlos Gómez".',
  'If nothing in an answer fits its field, omit that field instead of guessing, so the question is asked again.',
  'Call abort_booking only when the whole answer clearly asks to stop or cancel the booking, never because a background phrase contains words like "no", "ya" or "cancelar".',
].join('\n');

function question(step: BookingStep): string {
  switch (step) {
    case 'client':
      return '¿Cuál es el nombre del cliente?';
    case 'date':
      return '¿Para qué fecha es la cita?';
    case 'time':
      return '¿A qué hora?';
    case 'price':
      return '¿Cuánto cuesta el servicio?';
  }
}

const TOOLS: LlmTool[] = [
  {
    name: 'fill_booking',
    description: 'Record the booking details the user gave in their last answer. Omit what was not said.',
    parameters: {
      type: 'object',
      properties: {
        client: { type: 'string', description: 'Client full name' },
        date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
        time: { type: 'string', description: '24h time HH:mm' },
        price: { type: 'number', description: 'Price of the service in pesos, e.g. 15000' },
      },
    },
  },
  {
    name: 'abort_booking',
    description: 'The user wants to stop or cancel creating the appointment.',
    parameters: { type: 'object', properties: {} },
  },
];

@Injectable()
export class HandleBookingTurnUseCase {
  constructor(
    @Inject(LLM_PORT) private readonly llm: LlmPort,
    private readonly scheduleAppointment: ScheduleAppointmentUseCase,
    private readonly registerWalkIn: RegisterWalkInUseCase,
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly businessHours: GetBusinessHoursUseCase,
    private readonly dayBlocks: GetDayBlocksUseCase,
  ) {}

  async execute(input: BookingTurnInput): Promise<BookingTurnResult> {
    let draft: BookingDraft = sanitize(input.draft);
    const answers = input.answers;
    const text = answers ? labelAnswers(answers) : input.text.trim();

    if (text) {
      const expecting = nextStep(draft);
      const response = await this.llm.complete({
        system: answers ? this.buildAnswersPrompt(draft) : this.buildSystemPrompt(draft, expecting),
        user: text,
        tools: TOOLS,
      });
      const call = response.toolCalls[0];
      if (call?.name === 'abort_booking') {
        return { reply: 'De acuerdo, cita cancelada.', draft: {}, status: 'cancelled' };
      }
      if (call?.name === 'fill_booking') {
        draft = sanitize({ ...draft, ...pickDefined(call.arguments) });
      }
    }

    if (draft.date && draft.date < localIsoDate(new Date())) {
      return { reply: PAST_REPLY, draft: {}, status: 'cancelled' };
    }

    if (draft.date) {
      const hours = await this.businessHours.execute();
      const day = hours.forDate(draft.date);
      if (!day.open) {
        const { date: _closed, time: _time, ...keep } = draft;
        return { reply: CLOSED_DAY_REPLY, draft: keep, status: 'asking' };
      }
      if (draft.time && !hours.allows(draft.date, draft.time)) {
        const { time: _outside, ...keep } = draft;
        return { reply: outsideHoursReply(day), draft: keep, status: 'asking' };
      }
      const block = draft.time ? (await this.dayBlocks.execute(draft.date)).covering(draft.time) : undefined;
      if (block) {
        const { time: _blocked, ...keep } = draft;
        return { reply: blockedReply(block), draft: keep, status: 'asking' };
      }
    }

    if (draft.client && draft.date && (await this.hasActiveClientOn(draft.client, draft.date))) {
      // Ask for the name again: the app gives the user another listening window.
      const { client: _taken, ...keep } = draft;
      return {
        reply: `Ya existe una cita a nombre de ${draft.client} ese día. Agrégale otro nombre o apellido, o dime un nombre distinto.`,
        draft: keep,
        status: 'asking',
        listenSeconds: RETRY_LISTEN_SECONDS,
      };
    }

    const missing = nextStep(draft);
    if (missing) {
      // The step was answered but could not be read: say so before asking again.
      const retry = answers ? Boolean(answers[missing]) : text && missing === nextStep(sanitize(input.draft));
      const prompt = question(missing);
      return {
        reply: retry ? `No te he entendido. ${prompt}` : prompt,
        draft,
        status: 'asking',
      };
    }
    if (input.preview) {
      // The app shows these clean values for review and sends the draft back to save it.
      return { reply: '', draft, status: 'ready' };
    }
    return draft.walkIn ? this.createWalkIn(draft) : this.create(draft);
  }

  private async createWalkIn(draft: BookingDraft): Promise<BookingTurnResult> {
    const result = await this.registerWalkIn.execute({ serviceCost: draft.price ?? 0 });
    return {
      reply: walkInReply(result),
      draft: {},
      status: 'created',
      appointment: result.appointment,
    };
  }

  private async hasActiveClientOn(client: string, date: string): Promise<boolean> {
    const name = client.trim().toLowerCase();
    const appointments = await this.listAppointments.execute();
    return appointments.some(
      (a) => a.date === date && !a.cancelled && a.client.trim().toLowerCase() === name,
    );
  }

  private async create(draft: BookingDraft): Promise<BookingTurnResult> {
    try {
      const appointment = await this.scheduleAppointment.execute({
        client: draft.client ?? '',
        date: draft.date ?? '',
        time: draft.time ?? '',
        serviceCost: draft.price ?? 0,
        extras: [],
      });
      return {
        reply: `Listo. Cita creada para ${appointment.client} el ${appointment.date} a las ${appointment.time}.`,
        draft: {},
        status: 'created',
        appointment,
      };
    } catch (error) {
      // Recoverable problems: keep what the user already said and ask again only what is wrong.
      if (error instanceof AppointmentConflictError) {
        const { time: _taken, ...keep } = draft;
        return {
          reply: `El ${draft.date} a las ${draft.time} ya está ocupado. ¿A qué otra hora?`,
          draft: keep,
          status: 'asking',
        };
      }
      if (error instanceof OutsideBusinessHoursError) {
        const { time: _outside, ...keep } = draft;
        const day = (await this.businessHours.execute()).forDate(draft.date ?? '');
        return { reply: outsideHoursReply(day), draft: keep, status: 'asking' };
      }
      if (error instanceof BarberUnavailableError) {
        const { time: _blocked, ...keep } = draft;
        const block = (await this.dayBlocks.execute(draft.date ?? '')).covering(draft.time ?? '');
        return {
          reply: block ? blockedReply(block) : '¿A qué otra hora?',
          draft: keep,
          status: 'asking',
        };
      }
      if (error instanceof AppointmentInPastError) {
        return { reply: PAST_REPLY, draft: {}, status: 'cancelled' };
      }
      if (error instanceof InvalidAppointmentError) {
        return { reply: error.message, draft: {}, status: 'cancelled' };
      }
      throw error;
    }
  }

  /** Prompt for the single request that carries every answer of the dialog, each one labeled. */
  private buildAnswersPrompt(draft: BookingDraft): string {
    if (draft.walkIn) {
      return this.buildSystemPrompt(draft, 'price');
    }
    return [
      'You help book a barbershop appointment. The user answered several questions in Spanish, by voice or typed text.',
      'Each line of the message is labeled with the field it answers (client, date, time or price).',
      `Today is ${localIsoDate()}. Resolve relative dates ("mañana", "el viernes") to ISO dates.`,
      'Barbershop hours are daytime: "a las 4" means 16:00 unless the user says morning.',
      PRICE_HINT,
      NOISE_HINT,
      `Already collected: ${JSON.stringify(draft)}.`,
      'Call fill_booking with every detail you can extract from the answers. If an answer says they want to stop, call abort_booking.',
    ].join('\n');
  }

  private buildSystemPrompt(draft: BookingDraft, expecting: BookingStep | null): string {
    const today = localIsoDate();
    if (draft.walkIn) {
      return [
        'You help register a walk-in client being served right now at a barbershop. The user answers in Spanish.',
        'Only the price of the service is needed: never ask for or record the client name, date or time.',
        PRICE_HINT,
        NOISE_HINT,
        'Call fill_booking with only the price. If they want to stop, call abort_booking.',
      ].join('\n');
    }
    return [
      'You help book a barbershop appointment by voice or typed text. The user answers in Spanish, one question at a time.',
      `Today is ${today}. Resolve relative dates ("mañana", "el viernes") to ISO dates.`,
      'Barbershop hours are daytime: "a las 4" means 16:00 unless the user says morning.',
      PRICE_HINT,
      NOISE_HINT,
      `Already collected: ${JSON.stringify(draft)}.`,
      `The question just asked was about: ${expecting ?? 'confirmation'}.`,
      'Call fill_booking with ONLY the details present in the last answer (the user may give several at once). If they want to stop, call abort_booking.',
    ].join('\n');
  }
}

function walkInReply(result: WalkInResult): string {
  const parts = [`Listo. Cliente casual registrado ($${result.appointment.serviceCost}).`];
  if (result.shifted.length > 0) {
    const n = result.shifted.length;
    parts.push(
      `Corrí ${n === 1 ? 'una cita' : `${n} citas`} ${WALK_IN_MINUTES} minutos: ${listTimes(result.shifted)}.`,
    );
  }
  if (result.unavailable.length > 0) {
    parts.push(`Ojo, quedan fuera del horario disponible: ${listTimes(result.unavailable)}.`);
  }
  if (result.notMoved.length > 0) {
    parts.push(`No pude correr: ${listTimes(result.notMoved)}.`);
  }
  return parts.join(' ');
}

/** "Juan 10:30, Ana 11:30". */
function listTimes(appointments: AppointmentDto[]): string {
  return appointments.map((a) => `${a.client} ${a.time}`).join(', ');
}

function outsideHoursReply(day: DayHours): string {
  return `Ese día atendemos de ${spokenHour(day.openHour)} a ${spokenHour(day.closeHour)}. ¿A qué otra hora?`;
}

function blockedReply(block: TimeBlock): string {
  return `De ${spokenHour(block.fromHour)} a ${spokenHour(block.toHour)} no hay disponibilidad. ¿A qué otra hora?`;
}

/** `7` -> "07:00"; `24` -> "medianoche". */
function spokenHour(hour: number): string {
  return hour === 24 ? 'medianoche' : `${String(hour).padStart(2, '0')}:00`;
}

/** Keeps only valid, well-formed values so a bad LLM answer never reaches the domain. */
function sanitize(draft: BookingDraft): BookingDraft {
  const result: BookingDraft = {};
  const price = toPrice(draft.price);
  if (draft.walkIn === true) {
    // A walk-in only needs the price: name, date and time are never taken from the user.
    result.walkIn = true;
    if (price !== undefined) result.price = price;
    return result;
  }
  const client = typeof draft.client === 'string' ? draft.client.trim() : '';
  if (client) result.client = client;
  if (typeof draft.date === 'string' && ISO_DATE.test(draft.date)) result.date = draft.date;
  if (typeof draft.time === 'string' && TIME_24H.test(draft.time)) result.time = draft.time;
  if (price !== undefined) result.price = price;
  return result;
}

/** Accepts a number or a numeric string (the LLM may send either); undefined when not a valid price. */
function toPrice(value: unknown): number | undefined {
  const price = typeof value === 'string' && value.trim() ? Number(value.replace(/[$\s.,]/g, '')) : value;
  return typeof price === 'number' && Number.isFinite(price) && price >= 0 ? price : undefined;
}

/** `YYYY-MM-DD` in server local time, the same clock `ScheduleAppointmentUseCase` uses. */

function pickDefined(args: Record<string, unknown>): BookingDraft {
  const out: BookingDraft = {};
  for (const key of ['client', 'date', 'time'] as const) {
    const value = args[key];
    if (typeof value === 'string' && value.trim()) out[key] = value;
  }
  const price = toPrice(args['price']);
  if (price !== undefined) out.price = price;
  return out;
}

/** `client: "Juan"` one per line, in the order the questions are asked. */
function labelAnswers(answers: BookingAnswers): string {
  return (['client', 'date', 'time', 'price'] as const)
    .filter((step) => answers[step])
    .map((step) => `${step}: ${JSON.stringify(answers[step])}`)
    .join('\n');
}

function nextStep(draft: BookingDraft): BookingStep | null {
  if (draft.walkIn) return draft.price === undefined ? 'price' : null;
  if (!draft.client) return 'client';
  if (!draft.date) return 'date';
  if (!draft.time) return 'time';
  if (draft.price === undefined) return 'price';
  return null;
}
