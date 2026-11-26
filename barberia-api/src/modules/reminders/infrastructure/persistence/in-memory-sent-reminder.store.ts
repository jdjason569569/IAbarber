import { Injectable } from '@nestjs/common';
import type { SentReminderStore } from '../../domain/ports/sent-reminder.store.js';

/** Kept in memory: after a restart, an appointment less than the lead time away is reminded again. */
@Injectable()
export class InMemorySentReminderStore implements SentReminderStore {
  /** key → date of the appointment. */
  private readonly sent = new Map<string, string>();

  has(key: string): Promise<boolean> {
    return Promise.resolve(this.sent.has(key));
  }

  add(key: string, date: string): Promise<void> {
    this.sent.set(key, date);
    return Promise.resolve();
  }

  forgetBefore(date: string): Promise<void> {
    for (const [key, day] of this.sent) {
      if (day < date) this.sent.delete(key);
    }
    return Promise.resolve();
  }
}
