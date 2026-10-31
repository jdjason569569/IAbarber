import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ReplyToClientMessageUseCase } from '../../application/use-cases/reply-to-client-message.use-case.js';

interface ReplyRequest {
  text?: unknown;
  clientName?: unknown;
}

/** Called by the WhatsApp bot (open-wa) for every message a client sends. */
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly replyToClient: ReplyToClientMessageUseCase) {}

  @Post('reply')
  @HttpCode(200)
  async reply(@Body() body: ReplyRequest) {
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text) {
      throw new BadRequestException('text is required');
    }
    return this.replyToClient.execute({
      text,
      clientName: typeof body?.clientName === 'string' ? body.clientName : undefined,
    });
  }
}
