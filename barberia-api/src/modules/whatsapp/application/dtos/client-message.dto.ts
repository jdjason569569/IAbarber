export interface ClientMessageInput {
  text: string;
  /** WhatsApp display name of the sender, when known. */
  clientName?: string;
  /** Sender phone in international format without "+" (e.g. 573001234567), when known. */
  phone?: string;
  /**
   * open-wa chat id ("138392604016645@lid", "573001234567@c.us"): fixed per client, unlike the
   * display name, so it tells apart two clients with the same name.
   */
  chatId?: string;
}

export interface ClientMessageReply {
  reply: string;
}

/** A text message received from the WhatsApp Business Platform. */
export interface IncomingWhatsappMessage {
  /** WhatsApp message id; used to ignore deliveries Meta repeats. */
  id: string;
  from: string;
  text: string;
  clientName?: string;
}
