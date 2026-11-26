export const SENT_REMINDER_STORE = Symbol('SENT_REMINDER_STORE');

/** Remembers which appointment slots were already reminded, so each one is pushed only once. */
export interface SentReminderStore {
  has(key: string): Promise<boolean>;
  add(key: string, date: string): Promise<void>;
  /** Drops the reminders of days before `date` (`YYYY-MM-DD`). */
  forgetBefore(date: string): Promise<void>;
}
