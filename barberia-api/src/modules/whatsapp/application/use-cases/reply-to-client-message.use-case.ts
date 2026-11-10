import { Inject, Injectable } from '@nestjs/common';
import { ListAppointmentsUseCase } from '../../../appointments/application/use-cases/list-appointments.use-case.js';
import { ListAvailableSlotsUseCase } from '../../../appointments/application/use-cases/list-available-slots.use-case.js';
import { ScheduleAppointmentUseCase } from '../../../appointments/application/use-cases/schedule-appointment.use-case.js';
import { NotifyNewBookingUseCase } from '../../../notifications/application/use-cases/notify-new-booking.use-case.js';
import { NotifyTalkRequestUseCase } from '../../../notifications/application/use-cases/notify-talk-request.use-case.js';
import type { AppointmentDto, DaySlotsDto, ScheduleAppointmentInput } from '../../../appointments/application/dtos/appointment.dto.js';
import { DomainError } from '../../../../shared/errors/domain.error.js';
import { localIsoDate } from '../../../../shared/utils/local-date.js';
import { BookingMessage } from '../../domain/entities/booking-message.entity.js';
import type { BookingDay } from '../../domain/entities/booking-message.entity.js';
import { ClientChoice } from '../../domain/entities/client-choice.entity.js';
import { HANDOFF_REPOSITORY } from '../../domain/ports/handoff.repository.js';
import type { HandoffRepository } from '../../domain/ports/handoff.repository.js';
import type { ClientMessageInput, ClientMessageReply } from '../dtos/client-message.dto.js';

const DAYS: BookingDay[] = ['today', 'tomorrow'];
const DAY_LABELS: Record<BookingDay, string> = { today: 'Hoy', tomorrow: 'Mañana' };

/** Bookings made by clients on WhatsApp start at $0; the barber sets the price in the app. */
const WHATSAPP_SERVICE_COST = 0;

const HOW_TO_BOOK =
  'Para agendar escribe tu nombre, el día y la hora, por ejemplo: *Juan Pérez mañana 15:00*';

/** After asking for the barber, the bot stays silent with the client this long (renewed by each message). */
const HANDOFF_MINUTES = 30;

const TALK_HINT = 'Si prefieres hablar con el barbero, responde *2*.';

const dateFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Answers a client who writes on WhatsApp:
 * - A greeting (or anything without a time) gets a menu: 1 book, 2 talk with the barber.
 * - "1" (or "cita", "agendar"...) lists the free slots of today and tomorrow.
 * - "2" (or "barbero", "hablar"...) tells the barber with a push, and the bot stays silent with that
 *   client for HANDOFF_MINUTES so the barber answers from the same WhatsApp. An empty reply means
 *   "send nothing" (the open-wa bot and the Meta webhook both skip it).
 * - A message with a name and a time books that slot directly.
 * When the phone is known, a client can hold only one pending booking.
 */
@Injectable()
export class ReplyToClientMessageUseCase {
  constructor(
    private readonly availableSlots: ListAvailableSlotsUseCase,
    private readonly scheduleAppointment: ScheduleAppointmentUseCase,
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly notifyNewBooking: NotifyNewBookingUseCase,
    private readonly notifyTalkRequest: NotifyTalkRequestUseCase,
    @Inject(HANDOFF_REPOSITORY) private readonly handoffs: HandoffRepository,
  ) {}

  async execute(input: ClientMessageInput): Promise<ClientMessageReply> {
    const key = clientKey(input);
    if (key && (await this.handoffs.silencedUntil(key))) {
      // The client is talking with the barber: stay silent, and keep the silence while they talk.
      await this.handoffs.silence(key, handoffEnd());
      return { reply: '' };
    }

    const message = BookingMessage.parse(input.text);
    const choice = ClientChoice.parse(input.text);
    // A lone "1"/"2" is the menu answer, not a time; words only count when there is no time.
    const chosen = choice.isMenuNumber || !message.hasTime ? choice.kind : undefined;

    if (chosen === 'talk') {
      if (key) await this.handoffs.silence(key, handoffEnd());
      await this.notifyTalkRequest.execute({ client: input.clientName, phone: input.phone });
      return { reply: 'Listo 👍, ya le avisé al barbero. Te escribe en un momento por aquí.' };
    }

    const pending = input.phone ? await this.findPendingBooking(input.phone) : undefined;
    if (pending) {
      return {
        reply:
          `Hola ${pending.client} 👋, ya tienes una cita agendada para el ` +
          `${formatDate(pending.date)} a las ${pending.time}. Si necesitas cambiarla o cancelarla, ` +
          `responde *2* y el barbero te ayuda.`,
      };
    }
    if (chosen === 'book') {
      return { reply: slotsReply(await this.listSlots()) };
    }
    if (!message.hasTime) {
      return { reply: menu(input.clientName) };
    }
    const days = await this.listSlots();
    if (!message.client) {
      return { reply: `¿A nombre de quién agendamos la cita?\n\n${HOW_TO_BOOK}` };
    }

    const wanted = message.day ? days.filter((d) => d.day === message.day) : days;
    const slot = findSlot(wanted, message.candidateTimes);
    if (!slot) {
      return { reply: `Esa hora no está disponible 😕.\n\n${listSlots(days)}\n\n${HOW_TO_BOOK}` };
    }

    const booking: ScheduleAppointmentInput = {
      client: message.client,
      date: slot.date,
      time: slot.time,
      serviceCost: WHATSAPP_SERVICE_COST,
      extras: [],
      phone: input.phone,
    };
    try {
      await this.scheduleAppointment.execute(booking);
    } catch (error) {
      // Someone else may have taken the slot between listing and booking.
      if (!(error instanceof DomainError)) throw error;
      const fresh = await this.listSlots();
      return { reply: `Esa hora se acaba de ocupar 😕.\n\n${listSlots(fresh)}\n\n${HOW_TO_BOOK}` };
    }
    // Tell the barber's phone; it never throws, so the client always gets the confirmation.
    await this.notifyNewBooking.execute({ client: message.client, date: slot.date, time: slot.time });

    return {
      reply:
        `✅ Listo ${message.client}, tu cita quedó agendada para ` +
        `${DAY_LABELS[slot.day].toLowerCase()} ${formatDate(slot.date)} a las ${slot.time}. ¡Te esperamos! 💈`,
    };
  }

  /** The client's booking that still holds a future slot, if any. */
  private async findPendingBooking(phone: string): Promise<AppointmentDto | undefined> {
    const now = Date.now();
    return (await this.listAppointments.execute()).find(
      (a) =>
        a.phone === phone && !a.cancelled && !a.walkIn && !a.completed &&
        new Date(`${a.date}T${a.time}:00`).getTime() > now,
    );
  }

  private async listSlots(): Promise<(DaySlotsDto & { day: BookingDay })[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const slots = await this.availableSlots.execute([localIsoDate(), localIsoDate(tomorrow)]);
    return slots.map((s, i) => ({ ...s, day: DAYS[i] }));
  }
}

/** First free slot matching the client's time, trying each reading of it on each day in order. */
function findSlot(
  days: (DaySlotsDto & { day: BookingDay })[],
  times: string[],
): { day: BookingDay; date: string; time: string } | undefined {
  for (const time of times) {
    const day = days.find((d) => d.times.includes(time));
    if (day) return { day: day.day, date: day.date, time };
  }
  return undefined;
}

function menu(clientName: string | undefined): string {
  const name = clientName?.trim();
  return [
    `¡Hola${name ? ` ${name}` : ''}! 👋 Gracias por escribir a la barbería. ¿Qué quieres hacer?`,
    '',
    '1️⃣ Agendar una cita',
    '2️⃣ Hablar con el barbero',
    '',
    'Responde con el número.',
  ].join('\n');
}

function slotsReply(days: (DaySlotsDto & { day: BookingDay })[]): string {
  const canBook = days.some((d) => d.times.length > 0);
  return [
    listSlots(days),
    '',
    canBook ? HOW_TO_BOOK : 'No hay horas libres hoy ni mañana.',
    '',
    TALK_HINT,
  ].join('\n');
}

/** Identifies the client for the silence: the phone (Meta) or, when unknown (open-wa), the WhatsApp name. */
function clientKey(input: ClientMessageInput): string | undefined {
  if (input.phone) return `phone:${input.phone}`;
  const name = input.clientName?.trim().toLowerCase();
  return name ? `name:${name}` : undefined;
}

function handoffEnd(): number {
  return Date.now() + HANDOFF_MINUTES * 60_000;
}

function listSlots(days: (DaySlotsDto & { day: BookingDay })[]): string {
  return ['Estas son las horas disponibles:', '', ...days.map(describeDay)].join('\n');
}

function describeDay(day: DaySlotsDto & { day: BookingDay }): string {
  const times = day.times.length > 0 ? day.times.join(', ') : 'sin horas disponibles';
  return `📅 ${DAY_LABELS[day.day]} (${formatDate(day.date)}): ${times}`;
}

function formatDate(date: string): string {
  // Noon avoids landing on the previous day when the date is read in the shop's time zone.
  return dateFormat.format(new Date(`${date}T12:00:00`));
}
