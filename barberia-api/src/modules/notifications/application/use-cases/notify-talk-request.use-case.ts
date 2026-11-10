import { Inject, Injectable } from '@nestjs/common';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import { DEVICE_TOKEN_REPOSITORY } from '../../domain/ports/device-token.repository.js';
import type { DeviceTokenRepository } from '../../domain/ports/device-token.repository.js';
import { PUSH_SENDER } from '../../domain/ports/push-sender.port.js';
import type { PushSender } from '../../domain/ports/push-sender.port.js';
import type { TalkRequestInput } from '../dtos/device.dto.js';

/**
 * Tells the barber's phones that a client on WhatsApp wants to talk with them.
 * Never throws: a failed push must not break the reply to the client.
 */
@Injectable()
export class NotifyTalkRequestUseCase {
  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY) private readonly devices: DeviceTokenRepository,
    @Inject(PUSH_SENDER) private readonly push: PushSender,
  ) {}

  async execute(request: TalkRequestInput): Promise<void> {
    try {
      const tokens = await this.devices.findByWorkspace(WorkspaceContext.currentId());
      if (tokens.length === 0) return;
      const who = request.client?.trim() || (request.phone ? `+${request.phone}` : 'Un cliente');
      const { invalidTokens } = await this.push.send(tokens, {
        title: '💬 Quieren hablar contigo',
        body: `${who} quiere hablar contigo por WhatsApp`,
        data: { type: 'talk-request' },
      });
      if (invalidTokens.length > 0) {
        await this.devices.remove(invalidTokens);
      }
    } catch (error) {
      console.error('Talk request notification failed:', error instanceof Error ? error.message : error);
    }
  }
}
