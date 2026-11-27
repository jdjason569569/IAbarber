import { Inject, Injectable } from '@nestjs/common';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import { DEVICE_TOKEN_REPOSITORY } from '../../domain/ports/device-token.repository.js';
import type { DeviceTokenRepository } from '../../domain/ports/device-token.repository.js';
import { PUSH_SENDER } from '../../domain/ports/push-sender.port.js';
import type { PushSender } from '../../domain/ports/push-sender.port.js';
import { spokenTime } from '../spoken-time.js';

export interface OverdueAppointmentsInput {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Barber's name from the settings; empty when not set. */
  barber: string;
  /** Appointments of `date` that already ended and are still active, in time order. */
  appointments: { client: string; time: string }[];
}

/** How many clients are named aloud; the rest are only counted. */
const MAX_SPOKEN = 4;

/**
 * Tells the phones of the current workspace, with voice, that some appointments already ended and
 * are still active, and asks the barber to complete or cancel them in the app. Never throws.
 */
@Injectable()
export class NotifyOverdueAppointmentsUseCase {
  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY) private readonly devices: DeviceTokenRepository,
    @Inject(PUSH_SENDER) private readonly push: PushSender,
  ) {}

  async execute(input: OverdueAppointmentsInput): Promise<boolean> {
    try {
      const tokens = await this.devices.findByWorkspace(WorkspaceContext.currentId());
      if (tokens.length === 0 || input.appointments.length === 0) return false;
      const count = input.appointments.length;
      const { invalidTokens } = await this.push.send(tokens, {
        title: count === 1 ? '⚠️ Tienes un turno sin cerrar' : `⚠️ Tienes ${count} turnos sin cerrar`,
        body: `${input.appointments.map((a) => `${a.client} (${shortTime(a.time)})`).join(', ')}. ¿Los completaste o los cancelas?`,
        speech: speech(input),
        // One per day in the tray: a newer check replaces the previous one.
        tag: `overdue-appointments:${input.date}`,
        data: { type: 'overdue-appointments', date: input.date, count: String(count) },
      });
      if (invalidTokens.length > 0) {
        await this.devices.remove(invalidTokens);
      }
      return true;
    } catch (error) {
      console.error('Overdue appointments alert failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }
}

/**
 * "Andrés, tienes 2 turnos que ya pasaron y siguen activos: Ana a las 3 de la tarde y Pedro a las 4 y
 * media de la tarde. ¿Los completaste o los cancelas? Entra a la app y desliza cada tarjeta."
 */
function speech({ barber, appointments }: OverdueAppointmentsInput): string {
  const greeting = barber ? `${barber}, tienes` : 'Tienes';
  const named = appointments.slice(0, MAX_SPOKEN).map((a) => `${a.client} ${spokenTime(a.time)}`);
  const others = appointments.length - named.length;
  if (others > 0) named.push(others === 1 ? 'uno más' : `${others} más`);
  const list = named.length === 1 ? named[0] : `${named.slice(0, -1).join(', ')} y ${named[named.length - 1]}`;
  if (appointments.length === 1) {
    return `${greeting} un turno que ya pasó y sigue activo: ${list}. ¿Lo completaste o lo cancelas? Entra a la app y desliza la tarjeta.`;
  }
  return `${greeting} ${appointments.length} turnos que ya pasaron y siguen activos: ${list}. ¿Los completaste o los cancelas? Entra a la app y desliza cada tarjeta.`;
}

/** "15:30" → "3:30 p. m." */
function shortTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}
