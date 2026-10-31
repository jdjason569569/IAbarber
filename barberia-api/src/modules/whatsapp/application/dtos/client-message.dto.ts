export interface ClientMessageInput {
  text: string;
  /** WhatsApp display name of the sender, when known. */
  clientName?: string;
}

export interface ClientMessageReply {
  reply: string;
}
