import { Inject, Injectable } from '@nestjs/common';
import { localIsoDate } from '../../../../shared/utils/local-date.js';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import { ListAppointmentsUseCase } from '../../../appointments/application/use-cases/list-appointments.use-case.js';
import { ListNotifiedWorkspacesUseCase } from '../../../notifications/application/use-cases/list-notified-workspaces.use-case.js';
import { NotifyUpcomingAppointmentUseCase } from '../../../notifications/application/use-cases/notify-upcoming-appointment.use-case.js';
import { SENT_REMINDER_STORE } from '../../domain/ports/sent-reminder.store.js';
import type { SentReminderStore } from '../../domain/ports/sent-reminder.store.js';

/** How long before an appointment the barber is reminded. */
export const REMINDER_LEAD_MINUTES = 5;

const MINUTE_MS = 60_000;

/**
 * Pushes "appointment in 5 minutes" for every booking of today that starts within the lead time,
 * once per appointment slot (a moved appointment is reminded again at its new time).
 * Walk-ins, completed and cancelled appointments are skipped.
 */
@Injectable()
export class SendAppointmentRemindersUseCase {
  constructor(
    private readonly listWorkspaces: ListNotifiedWorkspacesUseCase,
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly notifyUpcoming: NotifyUpcomingAppointmentUseCase,
    @Inject(SENT_REMINDER_STORE) private readonly sent: SentReminderStore,
  ) {}

  async execute(now: Date = new Date()): Promise<void> {
    const today = localIsoDate(now);
    await this.sent.forgetBefore(today);
    const workspaceIds = await this.listWorkspaces.execute();
    for (const id of workspaceIds) {
      try {
        await WorkspaceContext.run({ id, role: 'admin' }, () => this.remindWorkspace(id, today, now));
      } catch (error) {
        console.error(`Reminders failed for workspace ${id}:`, error instanceof Error ? error.message : error);
      }
    }
  }

  private async remindWorkspace(workspaceId: string, today: string, now: Date): Promise<void> {
    const appointments = await this.listAppointments.execute();
    for (const a of appointments) {
      if (a.date !== today || a.cancelled || a.completed || a.walkIn) continue;
      // Parsed as local time: `process.env.TZ` is the shop's time zone.
      const msLeft = new Date(`${a.date}T${a.time}:00`).getTime() - now.getTime();
      if (msLeft <= 0 || msLeft > REMINDER_LEAD_MINUTES * MINUTE_MS) continue;
      const key = `${workspaceId}:${a.id}:${a.date}:${a.time}`;
      if (await this.sent.has(key)) continue;
      const minutes = Math.max(1, Math.ceil(msLeft / MINUTE_MS));
      if (await this.notifyUpcoming.execute({ client: a.client, date: a.date, time: a.time, minutes })) {
        await this.sent.add(key, a.date);
      }
    }
  }
}
