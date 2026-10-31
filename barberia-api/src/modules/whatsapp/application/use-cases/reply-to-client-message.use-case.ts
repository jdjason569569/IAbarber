import { Injectable } from '@nestjs/common';
import { ListAvailableSlotsUseCase } from '../../../appointments/application/use-cases/list-available-slots.use-case.js';
import { ScheduleAppointmentUseCase } from '../../../appointments/application/use-cases/schedule-appointment.use-case.js';
import type { DaySlotsDto } from '../../../appointments/application/dtos/appointment.dto.js';
import { DomainError } from '../../../../shared/errors/domain.error.js';
import { localIsoDate } from '../../../../shared/utils/local-date.js';
import { BookingMessage } from '../../domain/entities/booking-message.entity.js';
import type { BookingDay } from '../../domain/entities/booking-message.entity.js';
import type { ClientMessageInput, ClientMessageReply } from '../dtos/client-message.dto.js';

const DAYS: BookingDay[] = ['today', 'tomorrow'];
const DAY_LABELS: Record<BookingDay, string> = { today: 'Hoy', tomorrow: 'Mañana' };

/** Bookings made by clients on WhatsApp start at $0; the barber sets the price in the app. */
const WHATSAPP_SERVICE_COST = 0;

const HOW_TO_BOOK =
  'Para agendar escribe tu nombre, el día y la hora, por ejemplo: *Juan Pérez mañana 15:00*';

const dateFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Answers a client who writes on WhatsApp. A message with a name and a time books that slot;
 * anything else gets a greeting with the free slots of today and tomorrow.
 */
@Injectable()
export class ReplyToClientMessageUseCase {
  constructor(
    private readonly availableSlots: ListAvailableSlotsUseCase,
    private readonly scheduleAppointment: ScheduleAppointmentUseCase,
  ) {}

  async execute(input: ClientMessageInput): Promise<ClientMessageReply> {
    const message = BookingMessage.parse(input.text);
    const days = await this.listSlots();
    if (!message.hasTime) {
      return { reply: greeting(input.clientName, days) };
    }
    if (!message.client) {
      return { reply: `¿A nombre de quién agendamos la cita?\n\n${HOW_TO_BOOK}` };
    }

    const wanted = message.day ? days.filter((d) => d.day === message.day) : days;
    const slot = findSlot(wanted, message.candidateTimes);
    if (!slot) {
      return { reply: `Esa hora no está disponible 😕.\n\n${listSlots(days)}\n\n${HOW_TO_BOOK}` };
    }

    try {
      await this.scheduleAppointment.execute({
        client: message.client,
        date: slot.date,
        time: slot.time,
        serviceCost: WHATSAPP_SERVICE_COST,
        extras: [],
      });
    } catch (error) {
      // Someone else may have taken the slot between listing and booking.
      if (!(error instanceof DomainError)) throw error;
      const fresh = await this.listSlots();
      return { reply: `Esa hora se acaba de ocupar 😕.\n\n${listSlots(fresh)}\n\n${HOW_TO_BOOK}` };
    }

    return {
      reply:
        `✅ Listo ${message.client}, tu cita quedó agendada para ` +
        `${DAY_LABELS[slot.day].toLowerCase()} ${formatDate(slot.date)} a las ${slot.time}. ¡Te esperamos! 💈`,
    };
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

function greeting(clientName: string | undefined, days: (DaySlotsDto & { day: BookingDay })[]): string {
  const name = clientName?.trim();
  return [
    `¡Hola${name ? ` ${name}` : ''}! 👋 Gracias por escribir a la barbería.`,
    listSlots(days),
    '',
    days.some((d) => d.times.length > 0) ? HOW_TO_BOOK : 'Escríbenos y buscamos otro día para atenderte.',
  ].join('\n');
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
