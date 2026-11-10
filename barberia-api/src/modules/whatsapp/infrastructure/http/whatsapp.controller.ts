import { createHash, timingSafeEqual } from 'node:crypto';
import { BadRequestException, Body, Controller, ForbiddenException, HttpCode, Param, Post } from '@nestjs/common';
import { ADMIN_WORKSPACE, WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import { ReplyToClientMessageUseCase } from '../../application/use-cases/reply-to-client-message.use-case.js';

interface ReplyRequest {
  text?: unknown;
  clientName?: unknown;
}

/**
 * Called by the WhatsApp bot (open-wa) for every message a client sends.
 *
 * With `WHATSAPP_BOT_SECRET` set, only `POST /bot/<secret>/whatsapp/reply` answers. The secret goes
 * in the path because the bot cannot send headers: its `BACKEND_URL` becomes
 * `https://<host>/bot/<secret>`. Without the variable, the open `POST /whatsapp/reply` keeps working
 * (local development).
 */
@Controller()
export class WhatsappController {
  constructor(private readonly replyToClient: ReplyToClientMessageUseCase) {}

  @Post('whatsapp/reply')
  @HttpCode(200)
  async reply(@Body() body: ReplyRequest) {
    if (botSecret()) {
      throw new ForbiddenException('This route requires the bot secret');
    }
    return this.answer(body);
  }

  @Post('bot/:secret/whatsapp/reply')
  @HttpCode(200)
  async replyWithSecret(@Param('secret') secret: string, @Body() body: ReplyRequest) {
    const expected = botSecret();
    if (!expected || !sameSecret(secret, expected)) {
      throw new ForbiddenException('Invalid bot secret');
    }
    return this.answer(body);
  }

  private answer(body: ReplyRequest) {
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text) {
      throw new BadRequestException('text is required');
    }
    // WhatsApp clients always book in the admin's workspace, never in the guest demo.
    return WorkspaceContext.run(ADMIN_WORKSPACE, () =>
      this.replyToClient.execute({
        text,
        clientName: typeof body?.clientName === 'string' ? body.clientName : undefined,
      }),
    );
  }
}

function botSecret(): string | undefined {
  return process.env.WHATSAPP_BOT_SECRET?.trim() || undefined;
}

/** Constant-time comparison; hashing first makes both sides the same length. */
function sameSecret(received: string, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(received), digest(expected));
}
