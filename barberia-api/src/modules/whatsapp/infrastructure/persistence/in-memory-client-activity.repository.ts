import { Injectable } from '@nestjs/common';
import type { ClientActivityRepository, MessageActivity } from '../../domain/ports/client-activity.repository.js';

/** Clients kept in memory at most; the least recently active is forgotten first. */
const LIMIT = 1000;

/** Booking times are kept this long; the bot only asks about the last hour. */
const BOOKINGS_KEPT_MS = 2 * 60 * 60_000;

interface ClientEntry {
  times: number[];
  lastText: string;
  lastAt: number;
}

/**
 * Activity lives in memory: the limits only look at the last minutes, so losing it on a restart
 * only means a flooding client gets a fresh start.
 */
@Injectable()
export class InMemoryClientActivityRepository implements ClientActivityRepository {
  private readonly clients = new Map<string, ClientEntry>();
  private bookings: number[] = [];

  async recordMessage(clientKey: string, text: string, now: number, windowMs: number): Promise<MessageActivity> {
    const entry = this.clients.get(clientKey);
    const previous = entry ? { text: entry.lastText, at: entry.lastAt } : undefined;
    const times = (entry?.times ?? []).filter((t) => t > now - windowMs);
    times.push(now);

    // Re-insert so the Map keeps the most recently active client last.
    this.clients.delete(clientKey);
    this.clients.set(clientKey, { times, lastText: text, lastAt: now });
    if (this.clients.size > LIMIT) {
      this.clients.delete(this.clients.keys().next().value as string);
    }
    return { messagesInWindow: times.length, previous };
  }

  async bookingsSince(since: number): Promise<number> {
    return this.bookings.filter((t) => t > since).length;
  }

  async recordBooking(at: number): Promise<void> {
    this.bookings = this.bookings.filter((t) => t > at - BOOKINGS_KEPT_MS);
    this.bookings.push(at);
  }
}
