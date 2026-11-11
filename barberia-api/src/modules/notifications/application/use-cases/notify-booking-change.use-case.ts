import { Inject, Injectable } from '@nestjs/common';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import { DEVICE_TOKEN_REPOSITORY } from '../../domain/ports/device-token.repository.js';
import type { DeviceTokenRepository } from '../../domain/ports/device-token.repository.js';
import { PUSH_SENDER } from '../../domain/ports/push-sender.port.js';
import type { PushSender } from '../../domain/ports/push-sender.port.js';
import type { BookingChangeInput } from '../dtos/device.dto.js';

const dateFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Tells the phones of the current workspace that a client cancelled or moved their booking
 * (e.g. on WhatsApp). Never throws: a failed push must not break the change that triggered it.
 */
@Injectable()
export class NotifyBookingChangeUseCase {
  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY) private readonly devices: DeviceTokenRepository,
    @Inject(PUSH_SENDER) private readonly push: PushSender,
  ) {}

  async execute(change: BookingChangeInput): Promise<void> {
    try {
      const tokens = await this.devices.findByWorkspace(WorkspaceContext.currentId());
      if (tokens.length === 0) return;
      const cancelled = change.kind === 'cancelled';
      const { invalidTokens } = await this.push.send(tokens, {
        title: cancelled ? '❌ Cita cancelada' : '🔁 Cita reagendada',
        body: cancelled
          ? `${change.client} canceló su cita del ${formatDate(change.date)} a las ${change.time}`
          : `${change.client} movió su cita al ${formatDate(change.date)} a las ${change.time}`,
        data: {
          type: cancelled ? 'booking-cancelled' : 'booking-rescheduled',
          date: change.date,
          time: change.time,
        },
      });
      if (invalidTokens.length > 0) {
        await this.devices.remove(invalidTokens);
      }
    } catch (error) {
      console.error('Booking change notification failed:', error instanceof Error ? error.message : error);
    }
  }
}

function formatDate(date: string): string {
  // Noon avoids landing on the previous day when the date is read in the shop's time zone.
  return dateFormat.format(new Date(`${date}T12:00:00`));
}
