export const CLIENT_ACTIVITY_REPOSITORY = Symbol('CLIENT_ACTIVITY_REPOSITORY');

/** What a client has just done, so the bot can stop answering someone who floods or repeats. */
export interface MessageActivity {
  /** Messages from this client within the window, including the one just recorded. */
  messagesInWindow: number;
  /** The previous message, if any: its normalized text and when it arrived (epoch ms). */
  previous?: { text: string; at: number };
}

/** Recent WhatsApp activity, used to protect the bot and the agenda from abuse. */
export interface ClientActivityRepository {
  /** Records a client message (text already normalized) and returns their activity in `windowMs`. */
  recordMessage(clientKey: string, text: string, now: number, windowMs: number): Promise<MessageActivity>;
  /** Bookings made through WhatsApp since `since` (epoch ms), across all clients. */
  bookingsSince(since: number): Promise<number>;
  recordBooking(at: number): Promise<void>;
  /** The last reply sent to the client and when (epoch ms), if any. */
  lastReply(clientKey: string): Promise<{ text: string; at: number } | undefined>;
  recordReply(clientKey: string, text: string, at: number): Promise<void>;
}
