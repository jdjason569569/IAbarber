import { Injectable } from '@nestjs/common';
import type { PushMessage, PushSender, PushSendResult } from '../../domain/ports/push-sender.port.js';

/** Used when Firebase is not configured (local development): pushes are only logged. */
@Injectable()
export class DisabledPushSender implements PushSender {
  send(tokens: string[], message: PushMessage): Promise<PushSendResult> {
    console.log(`[push disabled] ${tokens.length} device(s): ${message.title} – ${message.body}`);
    return Promise.resolve({ invalidTokens: [] });
  }
}
