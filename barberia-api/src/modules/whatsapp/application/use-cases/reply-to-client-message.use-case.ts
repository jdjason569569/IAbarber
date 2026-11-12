import { Inject, Injectable } from '@nestjs/common';
import { ListAppointmentsUseCase } from '../../../appointments/application/use-cases/list-appointments.use-case.js';
import { ListAvailableSlotsUseCase } from '../../../appointments/application/use-cases/list-available-slots.use-case.js';
import { RescheduleAppointmentUseCase } from '../../../appointments/application/use-cases/reschedule-appointment.use-case.js';
import { ScheduleAppointmentUseCase } from '../../../appointments/application/use-cases/schedule-appointment.use-case.js';
import { SetAppointmentCancelledUseCase } from '../../../appointments/application/use-cases/set-appointment-cancelled.use-case.js';
import { GetServicePriceUseCase } from '../../../shop-settings/application/use-cases/get-service-price.use-case.js';
import { NotifyBookingChangeUseCase } from '../../../notifications/application/use-cases/notify-booking-change.use-case.js';
import { NotifyNewBookingUseCase } from '../../../notifications/application/use-cases/notify-new-booking.use-case.js';
import type { AppointmentDto, DaySlotsDto, ScheduleAppointmentInput } from '../../../appointments/application/dtos/appointment.dto.js';
import { DomainError } from '../../../../shared/errors/domain.error.js';
import { localIsoDate } from '../../../../shared/utils/local-date.js';
import { BookingMessage } from '../../domain/entities/booking-message.entity.js';
import type { BookingDay } from '../../domain/entities/booking-message.entity.js';
import { ClientChoice } from '../../domain/entities/client-choice.entity.js';
import type { ClientChoiceKind } from '../../domain/entities/client-choice.entity.js';
import { CLIENT_ACTIVITY_REPOSITORY } from '../../domain/ports/client-activity.repository.js';
import type { ClientActivityRepository } from '../../domain/ports/client-activity.repository.js';
import { HANDOFF_REPOSITORY } from '../../domain/ports/handoff.repository.js';
import type { HandoffRepository } from '../../domain/ports/handoff.repository.js';
import type { ClientMessageInput, ClientMessageReply } from '../dtos/client-message.dto.js';

const DAYS: BookingDay[] = ['today', 'tomorrow'];
const DAY_LABELS: Record<BookingDay, string> = { today: 'Hoy', tomorrow: 'Mañana' };


const HOW_TO_BOOK =
  'Para agendar escribe tu nombre, el día y la hora, por ejemplo: *Juan Pérez mañana 3:00 pm*';

/** Parts of the day the free slots are grouped in, by the hour each one starts (24 h). */
const DAY_PARTS: { label: string; from: number; to: number }[] = [
  { label: '🌅 Mañana', from: 0, to: 12 },
  { label: '☀️ Tarde', from: 12, to: 18 },
  { label: '🌙 Noche', from: 18, to: 24 },
];

/** After asking for the barber, the bot stays silent with the client this long (renewed by each message). */
const HANDOFF_MINUTES = 10;

// Abuse protection (per client: phone, chat id, or name as a fallback).
/** More than FLOOD_MAX_MESSAGES within FLOOD_WINDOW_MINUTES: one notice, then FLOOD_SILENCE_MINUTES of silence. */
const FLOOD_MAX_MESSAGES = 15;
const FLOOD_WINDOW_MINUTES = 3;
const FLOOD_SILENCE_MINUTES = 30;
/** The same text again within this time gets no answer (also stops loops with other bots). */
const REPEAT_MINUTES = 10;
/** WhatsApp bookings in the last hour, across all clients, before the bot stops booking. */
const MAX_BOOKINGS_PER_HOUR = 6;

const FLOOD_REPLY = 'Estás enviando muchos mensajes seguidos 🙏. El barbero te escribe en un rato por aquí.';
const BOOKINGS_FULL_REPLY =
  'En este momento no podemos agendar más citas por WhatsApp 😕. Responde *2* y el barbero te ayuda.';

const TALK_HINT = 'Si prefieres hablar con el barbero, responde *2*.';

/** Last line of both menus; tells a menu reply apart from the others. */
const MENU_FOOTER = 'Responde con el número.';
/**
 * A client often splits a greeting in several messages ("hola", "como", "estas"). Each one would get
 * the menu again, so the same menu right after itself within this time is not sent.
 */
const MENU_REPEAT_MINUTES = 2;

// A client with a pending booking may cancel it or move it once, up to this long before it starts.
const CHANGE_CUTOFF_MINUTES = 30;
const MAX_RESCHEDULES = 1;

const TOO_LATE_REPLY =
  `Tu cita es en menos de ${CHANGE_CUTOFF_MINUTES} minutos, así que ya no se puede cambiar por aquí. ` +
  'Responde *2* y el barbero te ayuda.';
const RESCHEDULE_LIMIT_REPLY =
  'Tu cita ya se cambió una vez, así que no se puede volver a cambiar por aquí. Responde *2* y el barbero te ayuda.';
const HOW_TO_RESCHEDULE = 'Escribe el día y la nueva hora, por ejemplo: *mañana 4:00 pm*';
/** Choices that touch a pending booking; without one they only get the menu. */
const CHANGE_CHOICES: ReadonlySet<ClientChoiceKind> = new Set(['cancel', 'confirmCancel', 'reschedule']);

const dateFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Answers a client who writes on WhatsApp:
 * - A greeting (or anything without a time) gets a menu: 1 book, 2 talk with the barber.
 * - "1" (or "cita", "agendar"...) lists the free slots of today and tomorrow.
 * - "2" (or "barbero", "hablar"...) makes the bot stay silent with that client for HANDOFF_MINUTES,
 *   so the barber answers from the same WhatsApp (no push is sent to the app). An empty reply means
 *   "send nothing" (the open-wa bot and the Meta webhook both skip it).
 * - A message with a name and a time books that slot directly. An hour from 1 to 11 without am/pm
 *   ("mañana 7:00") is not booked: the bot asks whether it is morning or evening.
 * A client known by phone (Meta) or chat id (open-wa) holds at most one pending booking. With one,
 * any message gets the menu of that booking: "3" cancels it (after "SI CANCELAR"), "4" or a new day
 * and time moves it (once), "2" talks with the barber. Less than CHANGE_CUTOFF_MINUTES before it
 * starts, changes go through the barber.
 */
@Injectable()
export class ReplyToClientMessageUseCase {
  constructor(
    private readonly availableSlots: ListAvailableSlotsUseCase,
    private readonly scheduleAppointment: ScheduleAppointmentUseCase,
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly setCancelled: SetAppointmentCancelledUseCase,
    private readonly rescheduleAppointment: RescheduleAppointmentUseCase,
    private readonly notifyNewBooking: NotifyNewBookingUseCase,
    private readonly notifyBookingChange: NotifyBookingChangeUseCase,
    @Inject(HANDOFF_REPOSITORY) private readonly handoffs: HandoffRepository,
    private readonly servicePrice: GetServicePriceUseCase,
    @Inject(CLIENT_ACTIVITY_REPOSITORY) private readonly activity: ClientActivityRepository,
  ) {}

  async execute(input: ClientMessageInput): Promise<ClientMessageReply> {
    const key = clientKey(input);
    if (key) {
      const until = await this.handoffs.silencedUntil(key);
      if (until) {
        // Talking with the barber, or flooding: stay silent, and keep the silence while they write.
        await this.handoffs.silence(key, Math.max(until, handoffEnd()));
        return { reply: '' };
      }
      const stop = await this.guardAgainstAbuse(key, input.text);
      if (stop !== undefined) return { reply: stop };
    }

    const reply = await this.respond(input, key);
    if (key && reply && (await this.isRepeatedMenu(key, reply))) return { reply: '' };
    if (key && reply) await this.activity.recordReply(key, reply, Date.now());
    return { reply };
  }

  /** True when this menu is the last reply the client got, a moment ago (a split greeting). */
  private async isRepeatedMenu(key: string, reply: string): Promise<boolean> {
    if (!reply.endsWith(MENU_FOOTER)) return false;
    const last = await this.activity.lastReply(key);
    return !!last && last.text === reply && Date.now() - last.at < MENU_REPEAT_MINUTES * 60_000;
  }

  /** The reply to a client that is not silenced nor flooding. */
  private async respond(input: ClientMessageInput, key: string | undefined): Promise<string> {
    const message = BookingMessage.parse(input.text);
    const choice = ClientChoice.parse(input.text);
    // A lone "1"/"2" is the menu answer, not a time; words only count when there is no time.
    const chosen = choice.isMenuNumber || !message.hasTime ? choice.kind : undefined;

    if (chosen === 'talk') {
      if (key) await this.handoffs.silence(key, handoffEnd());
      return 'Listo 👍, el barbero te escribe en un momento por aquí.';
    }

    const pending = await this.findPendingBooking(input);
    if (pending) {
      return await this.handlePending(pending, message, chosen);
    }
    if (chosen === 'book') {
      return slotsReply(await this.listSlots());
    }
    if (!message.hasTime || (chosen && CHANGE_CHOICES.has(chosen))) {
      return menu(input.clientName);
    }
    const days = await this.listSlots();
    if (!message.client) {
      return `¿A nombre de quién agendamos la cita?\n\n${HOW_TO_BOOK}`;
    }
    if (message.needsDayPart) {
      return askDayPart(message, true);
    }

    const wanted = message.day ? days.filter((d) => d.day === message.day) : days;
    const slot = findSlot(wanted, message.candidateTimes);
    if (!slot) {
      return `Esa hora no está disponible 😕.\n\n${listSlots(days)}\n\n${HOW_TO_BOOK}`;
    }

    // Safety net for someone booking under many names: a few WhatsApp bookings per hour at most.
    if ((await this.activity.bookingsSince(Date.now() - 60 * 60_000)) >= MAX_BOOKINGS_PER_HOUR) {
      return BOOKINGS_FULL_REPLY;
    }

    const price = await this.priceForBooking();
    const booking: ScheduleAppointmentInput = {
      client: message.client,
      date: slot.date,
      time: slot.time,
      serviceCost: price,
      extras: [],
      phone: input.phone,
      chatId: input.chatId,
    };
    try {
      await this.scheduleAppointment.execute(booking);
    } catch (error) {
      // Someone else may have taken the slot between listing and booking.
      if (!(error instanceof DomainError)) throw error;
      const fresh = await this.listSlots();
      return `Esa hora se acaba de ocupar 😕.\n\n${listSlots(fresh)}\n\n${HOW_TO_BOOK}`;
    }
    await this.activity.recordBooking(Date.now());
    // Tell the barber's phone; it never throws, so the client always gets the confirmation.
    await this.notifyNewBooking.execute({ client: message.client, date: slot.date, time: slot.time });

    return (
      `✅ Listo ${message.client}, tu cita quedó agendada para ` +
        `${DAY_LABELS[slot.day].toLowerCase()} ${formatDate(slot.date)} a las ${formatTime(slot.time)}.` +
        (price > 0 ? ` Valor del corte: ${formatMoney(price)}.` : '') +
      ' ¡Te esperamos! 💈'
    );
  }

  /**
   * A client who already holds a future booking: cancel it (after confirming), move it once to another
   * free slot by writing the new day and time, or get the menu of their booking. Close to the start
   * (CHANGE_CUTOFF_MINUTES) changes go through the barber.
   */
  private async handlePending(
    pending: AppointmentDto,
    message: BookingMessage,
    chosen: ClientChoiceKind | undefined,
  ): Promise<string> {
    const wantsChange = (chosen && CHANGE_CHOICES.has(chosen)) || (!chosen && message.hasTime);
    if (!wantsChange) return pendingMenu(pending);
    if (startsAt(pending) - Date.now() < CHANGE_CUTOFF_MINUTES * 60_000) return TOO_LATE_REPLY;
    const when = `${formatDate(pending.date)} a las ${formatTime(pending.time)}`;

    if (chosen === 'cancel') {
      return `¿Seguro que quieres cancelar tu cita del ${when}?\n\nPara confirmar responde *SI CANCELAR*.`;
    }
    if (chosen === 'confirmCancel') {
      await this.setCancelled.execute(pending.id, true);
      await this.notifyBookingChange.execute({
        kind: 'cancelled',
        client: pending.client,
        date: pending.date,
        time: pending.time,
      });
      return `❌ Tu cita del ${when} quedó cancelada. Si quieres agendar otra, escribe *1*.`;
    }
    if (pending.rescheduleCount >= MAX_RESCHEDULES) return RESCHEDULE_LIMIT_REPLY;
    if (chosen === 'reschedule') {
      return [`Tu cita es el ${when}.`, '', listSlots(await this.listSlots()), '', HOW_TO_RESCHEDULE].join('\n');
    }
    return this.reschedule(pending, message);
  }

  /** Moves the pending booking to the slot the client wrote ("mañana 4:00 pm"). */
  private async reschedule(pending: AppointmentDto, message: BookingMessage): Promise<string> {
    if (message.needsDayPart) return askDayPart(message, false);
    const days = await this.listSlots();
    const wanted = message.day ? days.filter((d) => d.day === message.day) : days;
    // The client's own slot is not free (they hold it), so it is checked before looking for one.
    if (wanted.some((d) => d.date === pending.date) && message.candidateTimes.includes(pending.time)) {
      return `Esa ya es la hora de tu cita 🙂. Si quieres otra, ${HOW_TO_RESCHEDULE.charAt(0).toLowerCase()}${HOW_TO_RESCHEDULE.slice(1)}`;
    }
    const slot = findSlot(wanted, message.candidateTimes);
    if (!slot) {
      return `Esa hora no está disponible 😕.\n\n${listSlots(days)}\n\n${HOW_TO_RESCHEDULE}`;
    }
    try {
      await this.rescheduleAppointment.execute(pending.id, slot.date, slot.time);
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      const fresh = await this.listSlots();
      return `Esa hora se acaba de ocupar 😕.\n\n${listSlots(fresh)}\n\n${HOW_TO_RESCHEDULE}`;
    }
    await this.notifyBookingChange.execute({
      kind: 'rescheduled',
      client: pending.client,
      date: slot.date,
      time: slot.time,
    });
    return (
      `🔁 Listo ${pending.client}, tu cita quedó para ` +
      `${DAY_LABELS[slot.day].toLowerCase()} ${formatDate(slot.date)} a las ${formatTime(slot.time)}. ¡Te esperamos! 💈`
    );
  }

  /**
   * Price set in the app's settings ("Valor del servicio"). If it cannot be read, the booking still
   * goes through at $0 (the barber can fix the price in the app), so the client is never left waiting.
   */
  private async priceForBooking(): Promise<number> {
    try {
      return await this.servicePrice.execute();
    } catch (error) {
      console.error('Reading the service price failed:', error instanceof Error ? error.message : error);
      return 0;
    }
  }

  /**
   * Floods and repeats. Returns the reply that ends the turn ('' = send nothing), or undefined
   * when the message may be answered normally.
   */
  private async guardAgainstAbuse(key: string, text: string): Promise<string | undefined> {
    const now = Date.now();
    const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
    const activity = await this.activity.recordMessage(key, normalized, now, FLOOD_WINDOW_MINUTES * 60_000);
    if (activity.messagesInWindow > FLOOD_MAX_MESSAGES) {
      // One notice; the silence then swallows the rest (checked first on each message).
      await this.handoffs.silence(key, now + FLOOD_SILENCE_MINUTES * 60_000);
      return FLOOD_REPLY;
    }
    const { previous } = activity;
    if (previous && previous.text === normalized && now - previous.at < REPEAT_MINUTES * 60_000) {
      return '';
    }
    return undefined;
  }

  /** The client's booking that still holds a future slot, found by phone (Meta) or chat id (open-wa). */
  private async findPendingBooking(input: ClientMessageInput): Promise<AppointmentDto | undefined> {
    const { phone, chatId } = input;
    if (!phone && !chatId) return undefined;
    const now = Date.now();
    return (await this.listAppointments.execute()).find(
      (a) =>
        ((phone && a.phone === phone) || (chatId && a.chatId === chatId)) &&
        !a.cancelled && !a.walkIn && !a.completed &&
        startsAt(a) > now,
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

/**
 * "7" alone could be 7 am or 7 pm. The bot keeps no conversation state, so the question carries both
 * full answers (name when booking, day and time) for the client to copy back as they are.
 */
function askDayPart(message: BookingMessage, withName: boolean): string {
  const clock = message.clock ?? '';
  const evening = Number(clock.split(':')[0]) <= 6 ? 'de la tarde' : 'de la noche';
  const name = withName && message.client ? message.client : '';
  const day = message.day ? DAY_LABELS[message.day].toLowerCase() : '';
  const answer = [name, day, clock].filter(Boolean).join(' ');
  return [
    `¿A las ${clock} de la mañana o ${evening}? 🤔`,
    '',
    'Responde con una de estas:',
    `*${answer} de la mañana*`,
    `*${answer} ${evening}*`,
  ].join('\n');
}

function menu(clientName: string | undefined): string {
  const name = clientName?.trim();
  return [
    `¡Hola${name ? ` ${name}` : ''}! 👋 Gracias por escribir a la barbería. ¿Qué quieres hacer?`,
    '',
    '1️⃣ Agendar una cita',
    '2️⃣ Hablar con el barbero',
    '',
    MENU_FOOTER,
  ].join('\n');
}

/** What a client with a pending booking can do with it. */
function pendingMenu(pending: AppointmentDto): string {
  return [
    `Hola ${pending.client} 👋, tienes una cita el ${formatDate(pending.date)} a las ${formatTime(pending.time)}.`,
    '',
    '3️⃣ Cancelar la cita',
    '4️⃣ Cambiar la hora',
    '2️⃣ Hablar con el barbero',
    '',
    MENU_FOOTER,
  ].join('\n');
}

/** Epoch ms when the appointment starts (read in the server time zone, the shop's). */
function startsAt(appointment: AppointmentDto): number {
  return new Date(`${appointment.date}T${appointment.time}:00`).getTime();
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

/**
 * Identifies the client for the silence: the phone (Meta), else the open-wa chat id. The WhatsApp
 * name is only a fallback for a bot that sends no chat id: two clients with the same name would
 * share it.
 */
function clientKey(input: ClientMessageInput): string | undefined {
  if (input.phone) return `phone:${input.phone}`;
  if (input.chatId) return `chat:${input.chatId}`;
  const name = input.clientName?.trim().toLowerCase();
  return name ? `name:${name}` : undefined;
}

function handoffEnd(): number {
  return Date.now() + HANDOFF_MINUTES * 60_000;
}

function listSlots(days: (DaySlotsDto & { day: BookingDay })[]): string {
  return ['Estas son las horas disponibles:', '', days.map(describeDay).join('\n\n')].join('\n');
}

/**
 * One day of free slots on the 12-hour clock, grouped by part of the day so it reads at a glance:
 *   📅 *Hoy, martes 10 de noviembre*
 *   🌅 Mañana: 9:00 · 9:30
 *   ☀️ Tarde: 12:30 · 1:00 · 2:30
 *   🌙 Noche: sin horas
 */
function describeDay(day: DaySlotsDto & { day: BookingDay }): string {
  const title = `📅 *${DAY_LABELS[day.day]}, ${formatDate(day.date).replace(',', '')}*`;
  if (day.times.length === 0) return `${title}\nSin horas disponibles`;
  const parts = DAY_PARTS.map(({ label, from, to }) => {
    const times = day.times.filter((t) => {
      const hour = Number(t.slice(0, 2));
      return hour >= from && hour < to;
    });
    return `${label}: ${times.length ? times.map(clock12).join(' · ') : 'sin horas'}`;
  });
  return [title, ...parts].join('\n');
}

/** `15:30` -> "3:30" (the part of the day already says morning, afternoon or night). */
function clock12(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, '0')}`;
}

/** `15:30` -> "3:30 pm", for sentences like "a las 3:30 pm". */
function formatTime(time: string): string {
  return `${clock12(time)} ${Number(time.slice(0, 2)) < 12 ? 'am' : 'pm'}`;
}

function formatMoney(value: number): string {
  return `$${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function formatDate(date: string): string {
  // Noon avoids landing on the previous day when the date is read in the shop's time zone.
  return dateFormat.format(new Date(`${date}T12:00:00`));
}
