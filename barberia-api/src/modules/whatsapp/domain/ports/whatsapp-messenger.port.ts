export const WHATSAPP_MESSENGER = Symbol('WHATSAPP_MESSENGER');

export interface WhatsappMessenger {
  /** Sends a text message; `to` is the phone in international format without "+". */
  sendText(to: string, text: string): Promise<void>;
}
