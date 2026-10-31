import { Injectable } from '@nestjs/common';
import { ListAvailableSlotsUseCase } from '../../../appointments/application/use-cases/list-available-slots.use-case.js';
import type { DaySlotsDto } from '../../../appointments/application/dtos/appointment.dto.js';
import { localIsoDate } from '../../../../shared/utils/local-date.js';
import type { ClientMessageInput, ClientMessageReply } from '../dtos/client-message.dto.js';

const DAY_LABELS = ['Hoy', 'Mañana'];

const dateFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

/** Answers a client who writes on WhatsApp. For now: a greeting with the free slots of today and tomorrow. */
@Injectable()
export class ReplyToClientMessageUseCase {
  constructor(private readonly availableSlots: ListAvailableSlotsUseCase) {}

  async execute(input: ClientMessageInput): Promise<ClientMessageReply> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const days = await this.availableSlots.execute([localIsoDate(), localIsoDate(tomorrow)]);

    const name = input.clientName?.trim();
    const lines = [
      `¡Hola${name ? ` ${name}` : ''}! 👋 Gracias por escribir a la barbería.`,
      'Estas son las horas disponibles:',
      '',
      ...days.map((day, i) => describeDay(DAY_LABELS[i], day)),
      '',
      days.some((d) => d.times.length > 0)
        ? 'Escríbenos la hora que prefieras y te la apartamos.'
        : 'Escríbenos y buscamos otro día para atenderte.',
    ];
    return { reply: lines.join('\n') };
  }
}

function describeDay(label: string, day: DaySlotsDto): string {
  // Noon avoids landing on the previous day when the date is read in the shop's time zone.
  const when = dateFormat.format(new Date(`${day.date}T12:00:00`));
  const times = day.times.length > 0 ? day.times.join(', ') : 'sin horas disponibles';
  return `📅 ${label} (${when}): ${times}`;
}
