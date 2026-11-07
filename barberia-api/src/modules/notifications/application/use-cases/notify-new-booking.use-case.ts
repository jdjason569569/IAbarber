import { Inject, Injectable } from '@nestjs/common';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import { DEVICE_TOKEN_REPOSITORY } from '../../domain/ports/device-token.repository.js';
import type { DeviceTokenRepository } from '../../domain/ports/device-token.repository.js';
import { PUSH_SENDER } from '../../domain/ports/push-sender.port.js';
import type { PushSender } from '../../domain/ports/push-sender.port.js';
import type { NewBookingInput } from '../dtos/device.dto.js';

const dateFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Tells the phones of the current workspace that a client booked an appointment (e.g. on WhatsApp).
 * Never throws: a failed push must not break the booking that triggered it.
 */
@Injectable()
export class NotifyNewBookingUseCase {
  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY) private readonly devices: DeviceTokenRepository,
    @Inject(PUSH_SENDER) private readonly push: PushSender,
  ) {}

  async execute(booking: NewBookingInput): Promise<void> {
    try {
      const tokens = await this.devices.findByWorkspace(WorkspaceContext.currentId());
      if (tokens.length === 0) return;
      const { invalidTokens } = await this.push.send(tokens, {
        title: '💈 Nueva cita',
        body: `${booking.client} agendó para el ${formatDate(booking.date)} a las ${booking.time}`,
        data: { type: 'new-booking', date: booking.date, time: booking.time },
      });
      if (invalidTokens.length > 0) {
        await this.devices.remove(invalidTokens);
      }
    } catch (error) {
      console.error('New booking notification failed:', error instanceof Error ? error.message : error);
    }
  }
}

function formatDate(date: string): string {
  // Noon avoids landing on the previous day when the date is read in the shop's time zone.
  return dateFormat.format(new Date(`${date}T12:00:00`));
}
