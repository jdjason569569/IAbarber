export const HANDOFF_REPOSITORY = Symbol('HANDOFF_REPOSITORY');

/**
 * Clients who asked to talk with the barber: while their time lasts the bot stays silent with them,
 * so the barber can answer from the same WhatsApp without the bot interrupting.
 */
export interface HandoffRepository {
  /** Epoch ms until the bot stays silent with this client, or undefined when it may answer. */
  silencedUntil(clientKey: string): Promise<number | undefined>;
  silence(clientKey: string, until: number): Promise<void>;
}
