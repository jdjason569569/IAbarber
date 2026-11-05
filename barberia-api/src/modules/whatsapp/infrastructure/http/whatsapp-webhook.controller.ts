import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import type { IncomingWhatsappMessage } from '../../application/dtos/client-message.dto.js';
import { HandleIncomingWhatsappMessageUseCase } from '../../application/use-cases/handle-incoming-whatsapp-message.use-case.js';
import { isValidMetaSignature } from './meta-signature.js';

/** Shape of the WhatsApp Cloud API webhook payload (only the fields used). */
interface WebhookPayload {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: { id?: string; from?: string; type?: string; text?: { body?: string } }[];
      };
    }[];
  }[];
}

/** Webhook of the official WhatsApp Business Platform (Meta Cloud API). */
@Controller('whatsapp/webhook')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(private readonly handleMessage: HandleIncomingWhatsappMessageUseCase) {}

  /** Meta calls this once when the webhook URL is registered and expects the challenge back. */
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const expected = process.env.WHATSAPP_VERIFY_TOKEN;
    if (mode !== 'subscribe' || !expected || token !== expected) {
      throw new ForbiddenException('Invalid verify token');
    }
    return challenge;
  }

  /** Always answers 200 once the signature is valid; otherwise Meta keeps retrying the delivery. */
  @Post()
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() body: WebhookPayload,
  ): Promise<string> {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret || !req.rawBody || !isValidMetaSignature(req.rawBody, signature, appSecret)) {
      this.logger.warn('Rejected webhook call with a missing or invalid signature');
      throw new ForbiddenException('Invalid signature');
    }

    for (const message of extractTextMessages(body)) {
      try {
        const handled = await this.handleMessage.execute(message);
        this.logger.log(`${handled ? 'Answered' : 'Skipped repeated'} message ${message.id} from ${message.from}`);
      } catch (error) {
        this.logger.error(
          `Could not answer message ${message.id} from ${message.from}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return 'EVENT_RECEIVED';
  }
}

/** Text messages of the payload; delivery statuses, audios, images... are ignored. */
function extractTextMessages(body: WebhookPayload): IncomingWhatsappMessage[] {
  if (body?.object !== 'whatsapp_business_account') return [];
  const messages: IncomingWhatsappMessage[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      const contacts = change.value?.contacts ?? [];
      for (const m of change.value?.messages ?? []) {
        const text = m.type === 'text' ? m.text?.body?.trim() : undefined;
        if (!m.id || !m.from || !text) continue;
        const name = contacts.find((c) => c.wa_id === m.from)?.profile?.name;
        messages.push({ id: m.id, from: m.from, text, clientName: name });
      }
    }
  }
  return messages;
}
