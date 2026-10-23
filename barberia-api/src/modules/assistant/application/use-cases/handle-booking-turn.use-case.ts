import { Inject, Injectable } from '@nestjs/common';
import { ListAppointmentsUseCase } from '../../../appointments/application/use-cases/list-appointments.use-case.js';
import { ScheduleAppointmentUseCase } from '../../../appointments/application/use-cases/schedule-appointment.use-case.js';
import { AppointmentConflictError } from '../../../appointments/domain/errors/appointment-conflict.error.js';
import { AppointmentInPastError } from '../../../appointments/domain/errors/appointment-in-past.error.js';
import { InvalidAppointmentError } from '../../../appointments/domain/errors/invalid-appointment.error.js';
import type { ServiceDto } from '../../../services/application/dtos/service.dto.js';
import { ListServicesUseCase } from '../../../services/application/use-cases/list-services.use-case.js';
import { LLM_PORT } from '../../domain/ports/llm.port.js';
import type { LlmPort, LlmTool } from '../../domain/ports/llm.port.js';
import type {
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

const NO_SERVICES_REPLY =
  'No hay servicios configurados. Agrégalos en la pestaña Settings de la app.';

function question(step: BookingStep, services: ServiceDto[]): string {
  switch (step) {
    case 'client':
      return '¿Cuál es el nombre del cliente?';
    case 'date':
      return '¿Para qué fecha es la cita?';
    case 'time':
      return '¿A qué hora?';
    case 'service':
      return `¿Qué servicio desea? Tenemos ${services.map((s) => s.name).join(', ')}.`;
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
        service: { type: 'string', description: 'Exact service name from the catalog' },
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
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly listServices: ListServicesUseCase,
  ) {}

  async execute(input: BookingTurnInput): Promise<BookingTurnResult> {
    const services = await this.listServices.execute();
    if (services.length === 0) {
      return { reply: NO_SERVICES_REPLY, draft: {}, status: 'cancelled' };
    }
    let draft: BookingDraft = sanitize(input.draft, services);
    const text = input.text.trim();

    if (text) {
      const expecting = nextStep(draft);
      const response = await this.llm.complete({
        system: this.buildSystemPrompt(draft, expecting, services),
        user: text,
        tools: TOOLS,
      });
      const call = response.toolCalls[0];
      if (call?.name === 'abort_booking') {
        return { reply: 'De acuerdo, cita cancelada.', draft: {}, status: 'cancelled' };
      }
      if (call?.name === 'fill_booking') {
        draft = sanitize({ ...draft, ...pickDefined(call.arguments) }, services);
      }
    }

    if (draft.date && draft.date < localIsoDate(new Date())) {
      return { reply: PAST_REPLY, draft: {}, status: 'cancelled' };
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
      const retry = text && missing === nextStep(sanitize(input.draft, services));
      const prompt = question(missing, services);
      return {
        reply: retry ? `No te he entendido. ${prompt}` : prompt,
        draft,
        status: 'asking',
      };
    }
    return this.create(draft, services);
  }

  private async hasActiveClientOn(client: string, date: string): Promise<boolean> {
    const name = client.trim().toLowerCase();
    const appointments = await this.listAppointments.execute();
    return appointments.some(
      (a) => a.date === date && !a.cancelled && a.client.trim().toLowerCase() === name,
    );
  }

  private async create(draft: BookingDraft, services: ServiceDto[]): Promise<BookingTurnResult> {
    const service = services.find((s) => s.name === draft.service);
    try {
      const appointment = await this.scheduleAppointment.execute({
        client: draft.client ?? '',
        service: draft.service ?? '',
        date: draft.date ?? '',
        time: draft.time ?? '',
        serviceCost: service?.price ?? 0,
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
      if (error instanceof AppointmentInPastError) {
        return { reply: PAST_REPLY, draft: {}, status: 'cancelled' };
      }
      if (error instanceof InvalidAppointmentError) {
        return { reply: error.message, draft: {}, status: 'cancelled' };
      }
      throw error;
    }
  }

  private buildSystemPrompt(
    draft: BookingDraft,
    expecting: BookingStep | null,
    services: ServiceDto[],
  ): string {
    const today = new Date().toISOString().slice(0, 10);
    return [
      'You help book a barbershop appointment by voice. The user speaks Spanish and answers one question at a time.',
      `Today is ${today}. Resolve relative dates ("mañana", "el viernes") to ISO dates.`,
      'Barbershop hours are daytime: "a las 4" means 16:00 unless the user says morning.',
      `Services: ${services.map((s) => s.name).join(', ')}. Map what the user says to the closest exact service name; if nothing matches, omit the service.`,
      `Already collected: ${JSON.stringify(draft)}.`,
      `The question just asked was about: ${expecting ?? 'confirmation'}.`,
      'Call fill_booking with ONLY the details present in the last answer (the user may give several at once). If they want to stop, call abort_booking.',
    ].join('\n');
  }
}

/** Keeps only valid, well-formed values so a bad LLM answer never reaches the domain. */
function sanitize(draft: BookingDraft, services: ServiceDto[]): BookingDraft {
  const result: BookingDraft = {};
  const client = typeof draft.client === 'string' ? draft.client.trim() : '';
  if (client) result.client = client;
  if (typeof draft.date === 'string' && ISO_DATE.test(draft.date)) result.date = draft.date;
  if (typeof draft.time === 'string' && TIME_24H.test(draft.time)) result.time = draft.time;
  const service = services.find((s) => s.name === draft.service);
  if (service) result.service = service.name;
  return result;
}

/** `YYYY-MM-DD` in server local time, the same clock `ScheduleAppointmentUseCase` uses. */
function localIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function pickDefined(args: Record<string, unknown>): BookingDraft {
  const out: BookingDraft = {};
  for (const key of ['client', 'date', 'time', 'service'] as const) {
    const value = args[key];
    if (typeof value === 'string' && value.trim()) out[key] = value;
  }
  return out;
}

function nextStep(draft: BookingDraft): BookingStep | null {
  if (!draft.client) return 'client';
  if (!draft.date) return 'date';
  if (!draft.time) return 'time';
  if (!draft.service) return 'service';
  return null;
}
