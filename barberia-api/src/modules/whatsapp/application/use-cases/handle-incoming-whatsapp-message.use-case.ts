import { Inject, Injectable } from '@nestjs/common';
import { WHATSAPP_MESSENGER } from '../../domain/ports/whatsapp-messenger.port.js';
import type { WhatsappMessenger } from '../../domain/ports/whatsapp-messenger.port.js';
import type { IncomingWhatsappMessage } from '../dtos/client-message.dto.js';
import { ReplyToClientMessageUseCase } from './reply-to-client-message.use-case.js';

/** Message ids remembered to skip repeated deliveries; Meta retries within minutes, so a short memory is enough. */
const SEEN_LIMIT = 1000;

/** Answers a message received from WhatsApp and sends the reply back to the client. */
@Injectable()
export class HandleIncomingWhatsappMessageUseCase {
  private readonly seen = new Set<string>();

  constructor(
    private readonly replyToClient: ReplyToClientMessageUseCase,
    @Inject(WHATSAPP_MESSENGER) private readonly messenger: WhatsappMessenger,
  ) {}

  /** Returns false when the message was already handled (Meta delivered it again). */
  async execute(message: IncomingWhatsappMessage): Promise<boolean> {
    if (this.seen.has(message.id)) return false;
    // Remembered before answering, so a retry that arrives meanwhile cannot book twice.
    this.seen.add(message.id);
    if (this.seen.size > SEEN_LIMIT) {
      this.seen.delete(this.seen.values().next().value as string);
    }

    const { reply } = await this.replyToClient.execute({
      text: message.text,
      clientName: message.clientName,
      phone: message.from,
    });
    await this.messenger.sendText(message.from, reply);
    return true;
  }
}
