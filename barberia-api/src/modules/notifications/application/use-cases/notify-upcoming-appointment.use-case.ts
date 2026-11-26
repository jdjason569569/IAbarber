import { Inject, Injectable } from '@nestjs/common';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import { DEVICE_TOKEN_REPOSITORY } from '../../domain/ports/device-token.repository.js';
import type { DeviceTokenRepository } from '../../domain/ports/device-token.repository.js';
import { PUSH_SENDER } from '../../domain/ports/push-sender.port.js';
import type { PushSender } from '../../domain/ports/push-sender.port.js';
import type { UpcomingAppointmentInput } from '../dtos/device.dto.js';

/**
 * Reminds the phones of the current workspace that an appointment starts in a few minutes. The app
 * reads it aloud when open. Returns false when the push could not be sent; never throws.
 */
@Injectable()
export class NotifyUpcomingAppointmentUseCase {
  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY) private readonly devices: DeviceTokenRepository,
    @Inject(PUSH_SENDER) private readonly push: PushSender,
  ) {}

  async execute(upcoming: UpcomingAppointmentInput): Promise<boolean> {
    try {
      const tokens = await this.devices.findByWorkspace(WorkspaceContext.currentId());
      if (tokens.length === 0) return false;
      const { invalidTokens } = await this.push.send(tokens, {
        title: `⏰ Cita en ${upcoming.minutes} minutos`,
        body: `${upcoming.client} a las ${upcoming.time}`,
        speech:
          upcoming.minutes === 1
            ? `Atención: en un minuto tienes cita con ${upcoming.client}.`
            : `Atención: en ${upcoming.minutes} minutos tienes cita con ${upcoming.client}.`,
        // The app leaves these out of the unseen-bookings modal by this tag prefix.
        tag: `appointment-reminder:${upcoming.date}:${upcoming.time}`,
        data: {
          type: 'appointment-reminder',
          client: upcoming.client,
          date: upcoming.date,
          time: upcoming.time,
          minutes: String(upcoming.minutes),
        },
      });
      if (invalidTokens.length > 0) {
        await this.devices.remove(invalidTokens);
      }
      return true;
    } catch (error) {
      console.error('Appointment reminder failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }
}
