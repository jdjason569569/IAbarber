import { Injectable } from '@nestjs/common';
import type { WhatsappMessenger } from '../../domain/ports/whatsapp-messenger.port.js';

const DEFAULT_GRAPH_VERSION = 'v23.0';

/** Sends messages through the official WhatsApp Cloud API (Meta Graph API). */
@Injectable()
export class MetaCloudWhatsappMessenger implements WhatsappMessenger {
  async sendText(to: string, text: string): Promise<void> {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      throw new Error('WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be set');
    }
    const version = process.env.WHATSAPP_GRAPH_VERSION ?? DEFAULT_GRAPH_VERSION;
    const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text, preview_url: false },
      }),
    });
    if (!res.ok) {
      throw new Error(`WhatsApp send failed: ${res.status} ${await res.text()}`);
    }
  }
}
