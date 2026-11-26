import { Injectable } from '@nestjs/common';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { SendAppointmentRemindersUseCase } from '../../application/use-cases/send-appointment-reminders.use-case.js';

const CHECK_EVERY_MS = 30_000;

/** Runs the reminder check every 30 seconds while the API is up. */
@Injectable()
export class AppointmentReminderScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly sendReminders: SendAppointmentRemindersUseCase) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.tick(), CHECK_EVERY_MS);
    this.timer.unref();
    void this.tick();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Skips a tick while the previous one is still running, so a slow database never doubles pushes. */
  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.sendReminders.execute();
    } catch (error) {
      console.error('Reminder check failed:', error instanceof Error ? error.message : error);
    } finally {
      this.running = false;
    }
  }
}
