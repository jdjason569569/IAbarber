import { Injectable } from '@nestjs/common';
import type { HandoffRepository } from '../../domain/ports/handoff.repository.js';

/** Clients kept in memory at most; the oldest is forgotten first. */
const LIMIT = 1000;

/**
 * Silences live in memory: they last minutes, so losing them on a restart only means the bot
 * answers again a bit earlier.
 */
@Injectable()
export class InMemoryHandoffRepository implements HandoffRepository {
  private readonly items = new Map<string, number>();

  async silencedUntil(clientKey: string): Promise<number | undefined> {
    const until = this.items.get(clientKey);
    if (until === undefined) return undefined;
    if (until <= Date.now()) {
      this.items.delete(clientKey);
      return undefined;
    }
    return until;
  }

  async silence(clientKey: string, until: number): Promise<void> {
    this.items.delete(clientKey);
    this.items.set(clientKey, until);
    if (this.items.size > LIMIT) {
      this.items.delete(this.items.keys().next().value as string);
    }
  }
}
